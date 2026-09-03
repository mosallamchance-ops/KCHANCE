-- ============================================================
-- Raffle Ticket Platform — Core Schema (Supabase / Postgres)
-- ============================================================

-- ---------- USERS (profile table, linked to Supabase auth.users) ----------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  age int,
  gender text,
  phone text unique,
  wallet_number text,
  province text,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PRODUCTS ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  product_value numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- ---------- DRAWS (a draw is its own entity, decoupled from product, per the doc's recommendation) ----------
create table public.draws (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  ticket_price numeric(12,2) not null check (ticket_price > 0),
  total_tickets int not null check (total_tickets > 0),
  sold_tickets int not null default 0 check (sold_tickets >= 0),
  max_tickets_per_user int not null default 3 check (max_tickets_per_user > 0),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active','sold_out','expired','completed')),
  winner_ticket_id uuid,
  winner_user_id uuid references public.users(id),
  prize_type text check (prize_type in ('product','cash')),
  prize_amount numeric(12,2),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sold_not_exceed_total check (sold_tickets <= total_tickets)
);

-- ---------- PURCHASES (one purchase = one checkout, may contain multiple tickets) ----------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  draw_id uuid not null references public.draws(id),
  quantity int not null check (quantity > 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

-- ---------- TICKETS ----------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique, -- e.g. IPH-000001
  draw_id uuid not null references public.draws(id),
  user_id uuid not null references public.users(id),
  purchase_id uuid not null references public.purchases(id),
  price numeric(12,2) not null,
  status text not null default 'valid' check (status in ('valid','void')),
  created_at timestamptz not null default now()
);

-- HARD LIMIT enforced at the database level: max N tickets per user per draw.
-- A partial unique index alone can't count tickets, so we use a trigger (below)
-- which re-checks the count inside the same transaction as ticket insert.

-- ---------- DEPOSITS (wallet top-up requests) ----------
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  amount numeric(12,2) not null check (amount > 0),
  transaction_code text,
  sender_name text,
  receipt_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_id uuid,
  rejection_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- ---------- TRANSACTIONS (immutable financial ledger) ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type text not null check (type in ('deposit','purchase','prize','correction')),
  amount numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  reference_id uuid, -- points to deposit_id / purchase_id / winner_id
  description text,
  created_at timestamptz not null default now()
);
-- Ledger rows are never updated or deleted by the app layer — corrections are new rows.

-- ---------- WINNERS ----------
create table public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id),
  user_id uuid not null references public.users(id),
  ticket_id uuid references public.tickets(id), -- null for the "expired, cash prize" case if you pick a buyer not a specific ticket
  prize_type text not null check (prize_type in ('product','cash')),
  prize_amount numeric(12,2),
  status text not null default 'pending'
    check (status in ('pending','verified','delivered','completed')),
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  title text not null,
  message text not null,
  type text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- ADMINS ----------
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role text not null check (role in ('super_admin','finance_admin','draw_manager','support_admin')),
  status text not null default 'active' check (status in ('active','suspended'))
);

-- ---------- AUDIT LOGS ----------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ENFORCE "max 3 tickets per user per draw" AT THE DB LEVEL
-- ============================================================
create or replace function public.enforce_ticket_limit()
returns trigger as $$
declare
  current_count int;
  max_allowed int;
begin
  select count(*) into current_count
  from public.tickets
  where draw_id = new.draw_id and user_id = new.user_id and status = 'valid';

  select max_tickets_per_user into max_allowed
  from public.draws where id = new.draw_id;

  if current_count >= max_allowed then
    raise exception 'Ticket limit exceeded for this draw';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_ticket_limit
before insert on public.tickets
for each row execute function public.enforce_ticket_limit();

-- ============================================================
-- ATOMIC PURCHASE FUNCTION
-- Run as a single DB transaction: lock the draw row, validate,
-- create tickets, deduct balance, log transaction — all-or-nothing.
-- This is what the API route calls (see /app/api/purchase).
-- ============================================================
create or replace function public.purchase_tickets(
  p_user_id uuid,
  p_draw_id uuid,
  p_quantity int
) returns jsonb as $$
declare
  v_draw record;
  v_user record;
  v_already_owned int;
  v_total numeric(12,2);
  v_purchase_id uuid;
  v_ticket_prefix text;
  v_next_num int;
  v_ticket_number text;
  i int;
begin
  -- Lock the draw row so concurrent purchases serialize here.
  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then
    raise exception 'Draw not found';
  end if;
  if v_draw.status <> 'active' then
    raise exception 'Draw is not active';
  end if;
  if now() < v_draw.start_at or now() > v_draw.end_at then
    raise exception 'Draw is not currently open';
  end if;

  select * into v_user from public.users where id = p_user_id for update;
  if v_user.status <> 'active' then
    raise exception 'User account is not active';
  end if;

  select count(*) into v_already_owned
  from public.tickets where draw_id = p_draw_id and user_id = p_user_id and status = 'valid';

  if v_already_owned + p_quantity > v_draw.max_tickets_per_user then
    raise exception 'Exceeds max tickets per user for this draw';
  end if;

  if p_quantity > (v_draw.total_tickets - v_draw.sold_tickets) then
    raise exception 'Not enough tickets remaining';
  end if;

  v_total := v_draw.ticket_price * p_quantity;

  if v_user.balance < v_total then
    raise exception 'Insufficient balance';
  end if;

  insert into public.purchases (user_id, draw_id, quantity, total_amount)
  values (p_user_id, p_draw_id, p_quantity, v_total)
  returning id into v_purchase_id;

  select upper(left(p.name, 3)) into v_ticket_prefix
  from public.products p where p.id = v_draw.product_id;

  v_next_num := v_draw.sold_tickets + 1;

  for i in 1..p_quantity loop
    v_ticket_number := v_ticket_prefix || '-' || lpad((v_next_num)::text, 6, '0');
    insert into public.tickets (ticket_number, draw_id, user_id, purchase_id, price)
    values (v_ticket_number, p_draw_id, p_user_id, v_purchase_id, v_draw.ticket_price);
    v_next_num := v_next_num + 1;
  end loop;

  update public.users
    set balance = balance - v_total, updated_at = now()
    where id = p_user_id;

  insert into public.transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
  values (p_user_id, 'purchase', -v_total, v_user.balance, v_user.balance - v_total, v_purchase_id,
          'Purchased ' || p_quantity || ' ticket(s)');

  update public.draws
    set sold_tickets = sold_tickets + p_quantity,
        status = case when sold_tickets + p_quantity >= total_tickets then 'sold_out' else status end
    where id = p_draw_id;

  return jsonb_build_object('purchase_id', v_purchase_id, 'quantity', p_quantity, 'total', v_total);
end;
$$ language plpgsql security definer;

-- ============================================================
-- ATOMIC DEPOSIT APPROVAL
-- ============================================================
create or replace function public.approve_deposit(p_deposit_id uuid, p_admin_id uuid)
returns void as $$
declare
  v_deposit record;
  v_user record;
begin
  select * into v_deposit from public.deposits where id = p_deposit_id for update;
  if v_deposit.status <> 'pending' then
    raise exception 'Deposit already processed';
  end if;

  select * into v_user from public.users where id = v_deposit.user_id for update;

  update public.users set balance = balance + v_deposit.amount, updated_at = now()
    where id = v_deposit.user_id;

  update public.deposits set status = 'approved', admin_id = p_admin_id, approved_at = now()
    where id = p_deposit_id;

  insert into public.transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
  values (v_deposit.user_id, 'deposit', v_deposit.amount, v_user.balance, v_user.balance + v_deposit.amount,
          p_deposit_id, 'Deposit approved');

  insert into public.notifications (user_id, title, message, type)
  values (v_deposit.user_id, 'Deposit Approved',
          'Your deposit request of $' || v_deposit.amount || ' was approved and added to your balance.',
          'deposit_approved');
end;
$$ language plpgsql security definer;

-- Row Level Security: enable + basic policies (tighten before going live)
alter table public.users enable row level security;
alter table public.tickets enable row level security;
alter table public.purchases enable row level security;
alter table public.deposits enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;

create policy "Users read own profile" on public.users for select using (auth.uid() = id);
create policy "Users update own profile" on public.users for update using (auth.uid() = id);
create policy "Users read own tickets" on public.tickets for select using (auth.uid() = user_id);
create policy "Users read own purchases" on public.purchases for select using (auth.uid() = user_id);
create policy "Users read own deposits" on public.deposits for select using (auth.uid() = user_id);
create policy "Users insert own deposits" on public.deposits for insert with check (auth.uid() = user_id);
create policy "Users read own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);

-- Products & draws & results are public read (no login required to browse)
alter table public.products enable row level security;
alter table public.draws enable row level security;
alter table public.winners enable row level security;
create policy "Public read products" on public.products for select using (true);
create policy "Public read draws" on public.draws for select using (true);
create policy "Public read winners" on public.winners for select using (true);
