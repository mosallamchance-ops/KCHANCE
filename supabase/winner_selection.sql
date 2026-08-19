-- ============================================================
-- WINNER SELECTION — server-side only, called by a scheduled job
-- (never exposed to the client). Handles both cases from the spec:
--   1) sold_out  -> winner gets the product
--   2) expired   -> random buyer gets 80% of total ticket sales value, in cash
-- ============================================================

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
    raise exception 'Draw not found';
  end if;

  if v_draw.status not in ('sold_out', 'expired') then
    raise exception 'Draw is not ready for winner selection (status: %)', v_draw.status;
  end if;

  if v_draw.sold_tickets = 0 then
    -- No tickets sold at all: no winner, just mark completed.
    update public.draws set status = 'completed', completed_at = now() where id = p_draw_id;
    return jsonb_build_object('winner', null, 'reason', 'no_tickets_sold');
  end if;

  -- Pick one random VALID ticket among all sold for this draw.
  -- gen_random_uuid() ordering gives an unpredictable, DB-side pick;
  -- for stronger auditability you can swap this for a keyed RNG and log the seed.
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
  returning id into v_winning_ticket.id; -- reuse var, id no longer needed after this

  -- Cash prizes get credited to the wallet immediately and logged in the ledger.
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
      else 'لقد فزت بجائزة نقدية قدرها $' || v_prize_amount || ' وتمت إضافتها إلى رصيدك.'
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

-- ============================================================
-- Marks draws whose end_at has passed but weren't sold out as 'expired'.
-- Run this alongside the winner-selection sweep.
-- ============================================================
create or replace function public.expire_overdue_draws()
returns void as $$
begin
  update public.draws
  set status = 'expired'
  where status = 'active' and end_at < now();
end;
$$ language plpgsql security definer;
