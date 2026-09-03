-- ============================================================
-- RESULTS VERIFICATION: timestamps, hash, and gating by "published"
-- Run in Supabase → SQL Editor, any time after the earlier migrations.
-- Safe to run more than once (idempotent).
-- ============================================================

-- pgcrypto gives us digest() for the verification hash. Supabase projects
-- almost always have this already, but this is a no-op if so.
create extension if not exists pgcrypto;

-- 1. Draws need to remember the moment ticket sales actually closed —
--    "end_at" is only the *scheduled* deadline; a draw that sells out
--    closes earlier than that.
alter table public.draws add column if not exists closed_at timestamptz;

-- 2. Winners need to remember when an admin actually published them —
--    "created_at" is when the random selection ran, which is a different
--    (earlier) moment than publish.
alter table public.winners add column if not exists published_at timestamptz;

-- 3. Purchase functions: stamp closed_at the moment a draw actually sells out.
create or replace function public.purchase_selected_tickets(
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
          'تم شراء ' || v_quantity || ' تذكرة');

  update public.draws
    set sold_tickets = sold_tickets + v_quantity,
        status = case when sold_tickets + v_quantity >= total_tickets then 'sold_out' else status end,
        closed_at = case
          when sold_tickets + v_quantity >= total_tickets and closed_at is null then now()
          else closed_at
        end
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

-- 4. Expiry: a draw that times out closes exactly at its scheduled end_at.
create or replace function public.expire_overdue_draws()
returns void as $$
begin
  update public.draws
  set status = 'expired',
      closed_at = coalesce(closed_at, end_at)
  where status = 'active' and end_at < now();
end;
$$ language plpgsql security definer;

-- 5. Public results view — dropped and recreated (see the earlier migration's
--    note on why "or replace" can't be used when the column set changes).
--    Two real changes here, not just cosmetic ones:
--      a) it now only returns winners.published = true, matching the
--         documented "admin must publish before it's public" behavior —
--         previously this view showed unpublished winners too, which
--         defeated the point of the publish gate.
--      b) it adds the three verification timestamps plus a sha-256
--         verification_hash for the transparency page.
drop view if exists public.public_results;

create view public.public_results as
select
  w.id,
  w.draw_id,
  w.prize_type,
  w.prize_amount,
  w.created_at as draw_date,
  w.created_at as selected_at,
  w.published_at,
  d.closed_at,
  d.total_tickets,
  d.sold_tickets,
  t.ticket_number as winning_ticket_number,
  public.mask_name(u.first_name, u.last_name) as winner_display_name,
  left(w.user_id::text, 8) as winner_public_id,
  p.name as product_name,
  p.image_url as product_image,
  encode(
    digest(w.draw_id::text || '|' || coalesce(w.ticket_id::text, '') || '|' || w.created_at::text, 'sha256'),
    'hex'
  ) as verification_hash
from public.winners w
join public.draws d on d.id = w.draw_id
join public.products p on p.id = d.product_id
left join public.users u on u.id = w.user_id
left join public.tickets t on t.id = w.ticket_id
where w.published = true
order by w.created_at desc;

grant select on public.public_results to anon, authenticated;

-- 6. Rename the deposits.sender_wallet column to sender_name — it now holds
--    a person's name (per an earlier change to the wallet page), not a
--    wallet number, so the column name should say what it actually stores.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deposits' and column_name = 'sender_wallet'
  ) then
    alter table public.deposits rename column sender_wallet to sender_name;
  end if;
end $$;
