-- ============================================================
-- MANUAL TICKET NUMBER SELECTION
-- Paste this entire file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once (idempotent).
-- ============================================================

-- 1. Add a numeric "slot" to each ticket: this is the number 1..total_tickets
--    that the user actually picks on the grid. ticket_number stays as the
--    human-readable padded display string, generated from the slot.
alter table public.tickets
  add column if not exists ticket_slot int;

-- One slot can only ever be sold once per draw.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_draw_slot_unique'
  ) then
    alter table public.tickets
      add constraint tickets_draw_slot_unique unique (draw_id, ticket_slot);
  end if;
end $$;

-- 1b. Backfill: any ticket sold BEFORE this migration (via the old quantity-based
--     purchase_tickets() function) has no ticket_slot yet. Assign one now, based on
--     purchase order within its draw, so those numbers correctly show as "taken" in
--     the new grid instead of silently being sellable again. Only fills nulls, so
--     this is safe to leave in and re-run any time.
do $$
declare
  r record;
begin
  for r in select id from public.draws loop
    update public.tickets t
    set ticket_slot = sub.rn
    from (
      select id, row_number() over (order by created_at) as rn
      from public.tickets
      where draw_id = r.id and ticket_slot is null and status = 'valid'
    ) sub
    where t.id = sub.id;
  end loop;
end $$;

-- 2. Public, safe-to-read view of which slots are taken for a draw.
--    Exposes ONLY draw_id + ticket_slot — never the buyer's identity.
--    Bypasses the tickets table's RLS (same pattern as public_results),
--    which is required since ticket ownership itself must stay private.
create or replace view public.draw_taken_slots as
select draw_id, ticket_slot
from public.tickets
where status = 'valid' and ticket_slot is not null;

grant select on public.draw_taken_slots to anon, authenticated;

-- 3. Atomic "buy these exact numbers" purchase function.
--    Mirrors purchase_tickets() but takes an explicit array of slot numbers
--    instead of a quantity. The unique constraint above is the real
--    concurrency guard: if two people submit the same slot at the same
--    moment, the second one fails here with a clean, catchable error
--    instead of silently double-selling a number.
create or replace function public.purchase_selected_tickets(
  p_user_id uuid,
  p_draw_id uuid,
  p_ticket_slots int[]
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
  v_slot int;
begin
  v_quantity := coalesce(array_length(p_ticket_slots, 1), 0);
  if v_quantity < 1 then
    raise exception 'يجب اختيار تذكرة واحدة على الأقل';
  end if;

  -- Reject duplicate numbers submitted in the same request.
  if v_quantity <> (select count(distinct s) from unnest(p_ticket_slots) as s) then
    raise exception 'لا يمكن اختيار نفس الرقم أكثر من مرة';
  end if;

  -- Lock the draw row so concurrent purchases serialize here.
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

  -- Every requested slot must be a real, in-range number.
  foreach v_slot in array p_ticket_slots loop
    if v_slot < 1 or v_slot > v_draw.total_tickets then
      raise exception 'رقم تذكرة غير صالح: %', v_slot;
    end if;
  end loop;

  v_total := v_draw.ticket_price * v_quantity;
  if v_user.balance < v_total then
    raise exception 'رصيدك لا يكفي لإتمام هذه العملية';
  end if;

  insert into public.purchases (user_id, draw_id, quantity, total_amount)
  values (p_user_id, p_draw_id, v_quantity, v_total)
  returning id into v_purchase_id;

  v_digit_width := greatest(4, length(v_draw.total_tickets::text));

  -- This insert loop is where a race with another buyer would surface:
  -- the unique (draw_id, ticket_slot) constraint raises here if someone
  -- else grabbed the same number first, and the whole transaction rolls back.
  foreach v_slot in array p_ticket_slots loop
    v_ticket_number := lpad(v_slot::text, v_digit_width, '0');
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
    'ticket_slots', p_ticket_slots
  );
exception
  when unique_violation then
    raise exception 'أحد الأرقام التي اخترتها تم بيعه للتو من قبل مستخدم آخر — الرجاء اختيار رقم مختلف';
end;
$$ language plpgsql security definer;
