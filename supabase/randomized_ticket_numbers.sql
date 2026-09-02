-- ============================================================
-- RANDOMIZED, SEARCHABLE TICKET NUMBERS
-- Run this AFTER manual_ticket_selection.sql, in Supabase → SQL Editor.
-- Safe to run more than once (idempotent).
-- ============================================================

-- 1. The shuffle map: for every draw, slot 1..total_tickets (internal
--    bookkeeping only, never shown to users) is paired with a random,
--    unique display_number in the same 1..total_tickets range. This is
--    generated once per draw and stored — not recomputed on the fly —
--    so the same number always means the same slot.
create table if not exists public.ticket_slot_map (
  draw_id uuid not null references public.draws(id),
  slot int not null,
  display_number int not null,
  primary key (draw_id, slot)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ticket_slot_map_draw_display_unique'
  ) then
    alter table public.ticket_slot_map
      add constraint ticket_slot_map_draw_display_unique unique (draw_id, display_number);
  end if;
end $$;

alter table public.ticket_slot_map enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'ticket_slot_map' and policyname = 'Public read ticket_slot_map'
  ) then
    create policy "Public read ticket_slot_map" on public.ticket_slot_map for select using (true);
  end if;
end $$;
grant select on public.ticket_slot_map to anon, authenticated;

-- 2. Generates (once) the shuffled map for a single draw. Safe to call
--    repeatedly — does nothing if the draw already has a map.
create or replace function public.generate_slot_map(p_draw_id uuid)
returns void as $$
declare
  v_total int;
begin
  select total_tickets into v_total from public.draws where id = p_draw_id;
  if v_total is null or v_total < 1 then
    return;
  end if;
  if exists (select 1 from public.ticket_slot_map where draw_id = p_draw_id) then
    return;
  end if;

  insert into public.ticket_slot_map (draw_id, slot, display_number)
  select p_draw_id, a.slot_seq, b.disp_seq
  from (
    select row_number() over () as rn, s as slot_seq
    from generate_series(1, v_total) as s
  ) a
  join (
    select row_number() over (order by random()) as rn, s as disp_seq
    from generate_series(1, v_total) as s
  ) b using (rn);
end;
$$ language plpgsql;

-- 3. Auto-generate the map the moment a new draw is created, so admins
--    never have to think about this step.
create or replace function public.trg_generate_slot_map_fn()
returns trigger as $$
begin
  perform public.generate_slot_map(new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_slot_map on public.draws;
create trigger trg_generate_slot_map
after insert on public.draws
for each row execute function public.trg_generate_slot_map_fn();

-- 4. Backfill: generate maps for any draws that already existed before
--    this migration ran.
do $$
declare r record;
begin
  for r in select id from public.draws loop
    perform public.generate_slot_map(r.id);
  end loop;
end $$;

-- 5. Public "which numbers are taken" view now reports display_number
--    (the random number the user actually sees), not the internal slot.
--    Dropped and recreated (not "or replace") because Postgres won't let
--    a plain replace rename a view's column from ticket_slot to display_number.
drop view if exists public.draw_taken_slots;

create view public.draw_taken_slots as
select t.draw_id, m.display_number
from public.tickets t
join public.ticket_slot_map m on m.draw_id = t.draw_id and m.slot = t.ticket_slot
where t.status = 'valid' and t.ticket_slot is not null;

grant select on public.draw_taken_slots to anon, authenticated;

-- 6. "Give me N available numbers" — used for the 9-number suggestion grid.
create or replace function public.suggest_available_numbers(p_draw_id uuid, p_limit int default 9)
returns table(display_number int) as $$
  select m.display_number
  from public.ticket_slot_map m
  where m.draw_id = p_draw_id
    and not exists (
      select 1 from public.tickets t
      where t.draw_id = m.draw_id and t.ticket_slot = m.slot and t.status = 'valid'
    )
  order by random()
  limit p_limit;
$$ language sql stable;

grant execute on function public.suggest_available_numbers(uuid, int) to anon, authenticated;

-- 7. Purchase function now takes the numbers the user actually picked
--    (display numbers) and resolves each back to its internal slot —
--    the concurrency guard (unique constraint on tickets.ticket_slot)
--    still works exactly as before.
--    Dropped first (not "or replace") because Postgres won't let a plain
--    replace rename a parameter from p_ticket_slots to p_display_numbers.
drop function if exists public.purchase_selected_tickets(uuid, uuid, int[]);

create function public.purchase_selected_tickets(
  p_user_id uuid,
  p_draw_id uuid,
  p_display_numbers int[]
) returns jsonb as $$
declare
  v_draw record;
  v_user record;
  v_already_owned int;
  v_quantity int;
  v_total numeric(12,2);
  v_purchase_id uuid;
  v_digit_width int;
  v_ticket_number text;
  v_display int;
  v_slot int;
begin
  v_quantity := coalesce(array_length(p_display_numbers, 1), 0);
  if v_quantity < 1 then
    raise exception 'يجب اختيار تذكرة واحدة على الأقل';
  end if;

  if v_quantity <> (select count(distinct d) from unnest(p_display_numbers) as d) then
    raise exception 'لا يمكن اختيار نفس الرقم أكثر من مرة';
  end if;

  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then
    raise exception 'السحب غير موجود';
  end if;
  if v_draw.status <> 'active' then
    raise exception 'هذا السحب غير متاح للشراء حالياً';
  end if;
  if now() < v_draw.start_at or now() > v_draw.end_at then
    raise exception 'هذا السحب غير مفتوح حالياً';
  end if;

  select * into v_user from public.users where id = p_user_id for update;
  if v_user.status <> 'active' then
    raise exception 'الحساب غير مفعّل';
  end if;

  select count(*) into v_already_owned
  from public.tickets where draw_id = p_draw_id and user_id = p_user_id and status = 'valid';

  if v_already_owned + v_quantity > v_draw.max_tickets_per_user then
    raise exception 'تجاوزت الحد الأقصى المسموح من التذاكر لهذا السحب';
  end if;

  if v_quantity > (v_draw.total_tickets - v_draw.sold_tickets) then
    raise exception 'لا يوجد عدد كافٍ من التذاكر المتبقية';
  end if;

  v_total := v_draw.ticket_price * v_quantity;
  if v_user.balance < v_total then
    raise exception 'رصيدك لا يكفي لإتمام هذه العملية';
  end if;

  insert into public.purchases (user_id, draw_id, quantity, total_amount)
  values (p_user_id, p_draw_id, v_quantity, v_total)
  returning id into v_purchase_id;

  v_digit_width := greatest(4, length(v_draw.total_tickets::text));

  foreach v_display in array p_display_numbers loop
    select slot into v_slot from public.ticket_slot_map
      where draw_id = p_draw_id and display_number = v_display;
    if v_slot is null then
      raise exception 'رقم تذكرة غير صالح: %', v_display;
    end if;

    v_ticket_number := lpad(v_display::text, v_digit_width, '0');
    insert into public.tickets (ticket_number, draw_id, user_id, purchase_id, price, ticket_slot)
    values (v_ticket_number, p_draw_id, p_user_id, v_purchase_id, v_draw.ticket_price, v_slot);
  end loop;

  update public.users
    set balance = balance - v_total, updated_at = now()
    where id = p_user_id;

  insert into public.transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
  values (p_user_id, 'purchase', -v_total, v_user.balance, v_user.balance - v_total, v_purchase_id,
          'Purchased ' || v_quantity || ' selected ticket(s)');

  update public.draws
    set sold_tickets = sold_tickets + v_quantity,
        status = case when sold_tickets + v_quantity >= total_tickets then 'sold_out' else status end
    where id = p_draw_id;

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'quantity', v_quantity,
    'total', v_total,
    'ticket_numbers', p_display_numbers
  );
exception
  when unique_violation then
    raise exception 'أحد الأرقام التي اخترتها تم بيعه للتو من قبل مستخدم آخر — الرجاء اختيار رقم مختلف';
end;
$$ language plpgsql security definer;
