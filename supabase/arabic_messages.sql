-- ============================================================
-- ARABIC-ONLY USER-FACING TEXT
-- Fixes every remaining English string that could show up in transaction
-- history, notifications, or error messages (e.g. "Purchased 1 ticket(s)").
-- Run in Supabase → SQL Editor, any time after the earlier migrations.
-- Safe to run more than once (idempotent) — none of these change a
-- parameter name, so plain "create or replace" is enough everywhere here.
-- ============================================================

-- 1. Ticket-limit trigger (backstop check on every ticket insert).
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
    raise exception 'تجاوزت الحد الأقصى المسموح من التذاكر لهذا السحب';
  end if;

  return new;
end;
$$ language plpgsql;

-- 2. Old quantity-based purchase function (kept for backward compatibility —
--    the app now uses purchase_selected_tickets, but this is still reachable
--    via /api/purchase if anything still calls it).
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

  if v_already_owned + p_quantity > v_draw.max_tickets_per_user then
    raise exception 'تجاوزت الحد الأقصى المسموح من التذاكر لهذا السحب';
  end if;

  if p_quantity > (v_draw.total_tickets - v_draw.sold_tickets) then
    raise exception 'لا يوجد عدد كافٍ من التذاكر المتبقية';
  end if;

  v_total := v_draw.ticket_price * p_quantity;

  if v_user.balance < v_total then
    raise exception 'رصيدك لا يكفي لإتمام هذه العملية';
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
          'تم شراء ' || p_quantity || ' تذكرة');

  update public.draws
    set sold_tickets = sold_tickets + p_quantity,
        status = case when sold_tickets + p_quantity >= total_tickets then 'sold_out' else status end
    where id = p_draw_id;

  return jsonb_build_object('purchase_id', v_purchase_id, 'quantity', p_quantity, 'total', v_total);
end;
$$ language plpgsql security definer;

-- 3. Current purchase function (the one the picker page actually calls) —
--    only the transaction description line was still in English.
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

-- 4. Deposit approval — exception, ledger description, and the notification
--    the user actually sees were all in English.
create or replace function public.approve_deposit(p_deposit_id uuid, p_admin_id uuid)
returns void as $$
declare
  v_deposit record;
  v_user record;
begin
  select * into v_deposit from public.deposits where id = p_deposit_id for update;
  if v_deposit.status <> 'pending' then
    raise exception 'تمت معالجة طلب الشحن هذا مسبقاً';
  end if;

  select * into v_user from public.users where id = v_deposit.user_id for update;

  update public.users set balance = balance + v_deposit.amount, updated_at = now()
    where id = v_deposit.user_id;

  update public.deposits set status = 'approved', admin_id = p_admin_id, approved_at = now()
    where id = p_deposit_id;

  insert into public.transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
  values (v_deposit.user_id, 'deposit', v_deposit.amount, v_user.balance, v_user.balance + v_deposit.amount,
          p_deposit_id, 'تمت الموافقة على طلب الشحن');

  insert into public.notifications (user_id, title, message, type)
  values (v_deposit.user_id, 'تمت الموافقة على طلب الشحن',
          'تمت الموافقة على طلب شحن رصيدك بمبلغ ' || v_deposit.amount || ' ل.س وأُضيف إلى محفظتك.',
          'deposit_approved');
end;
$$ language plpgsql security definer;

-- 5. Winner selection — two internal error messages, plus the cash-prize
--    notification was using "$" instead of "ل.س".
create or replace function public.select_winner_for_draw(p_draw_id uuid)
returns jsonb as $$
declare
  v_draw record;
  v_winning_ticket record;
  v_prize_type text;
  v_prize_amount numeric(12,2);
  v_winner_id uuid;
  v_total_sales numeric(12,2);
begin
  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found then
    raise exception 'السحب غير موجود';
  end if;

  if v_draw.status not in ('sold_out', 'expired') then
    raise exception 'هذا السحب غير جاهز لاختيار الفائز (الحالة: %)', v_draw.status;
  end if;

  if v_draw.sold_tickets = 0 then
    update public.draws set status = 'completed', completed_at = now() where id = p_draw_id;
    return jsonb_build_object('winner', null, 'reason', 'no_tickets_sold');
  end if;

  select * into v_winning_ticket
  from public.tickets
  where draw_id = p_draw_id and status = 'valid'
  order by random()
  limit 1;

  v_winner_id := v_winning_ticket.user_id;

  if v_draw.status = 'sold_out' then
    v_prize_type := 'product';
    v_prize_amount := null;
  else
    v_prize_type := 'cash';
    v_total_sales := v_draw.sold_tickets * v_draw.ticket_price;
    v_prize_amount := round(v_total_sales * 0.8, 2);
  end if;

  update public.draws
  set status = 'completed',
      winner_ticket_id = v_winning_ticket.id,
      winner_user_id = v_winner_id,
      prize_type = v_prize_type,
      prize_amount = v_prize_amount,
      completed_at = now()
  where id = p_draw_id;

  insert into public.winners (draw_id, user_id, ticket_id, prize_type, prize_amount, status)
  values (p_draw_id, v_winner_id, v_winning_ticket.id, v_prize_type, v_prize_amount, 'pending')
  returning id into v_winning_ticket.id;

  if v_prize_type = 'cash' then
    update public.users set balance = balance + v_prize_amount, updated_at = now() where id = v_winner_id;

    insert into public.transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
    select v_winner_id, 'prize', v_prize_amount, balance - v_prize_amount, balance, p_draw_id, 'جائزة سحب نقدية'
    from public.users where id = v_winner_id;
  end if;

  insert into public.notifications (user_id, title, message, type)
  values (
    v_winner_id,
    'مبروك! لقد ربحت السحب',
    case when v_prize_type = 'product'
      then 'لقد فزت بالمنتج في السحب. سيتم التواصل معك لتسليم الجائزة.'
      else 'لقد فزت بجائزة نقدية قدرها ' || v_prize_amount || ' ل.س وتمت إضافتها إلى رصيدك.'
    end,
    'winner'
  );

  return jsonb_build_object(
    'winner_user_id', v_winner_id,
    'winning_ticket', v_winning_ticket.ticket_number,
    'prize_type', v_prize_type,
    'prize_amount', v_prize_amount
  );
end;
$$ language plpgsql security definer;
