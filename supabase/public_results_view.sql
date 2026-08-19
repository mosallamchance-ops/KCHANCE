-- ============================================================
-- PUBLIC RESULTS VIEW
-- Exposes only what the results page needs, with the winner's name
-- masked for privacy (e.g. "محمد أ."), never phone/email/full identity.
-- ============================================================

create or replace function public.mask_name(first_name text, last_name text)
returns text as $$
begin
  if first_name is null then
    return 'مستخدم';
  end if;
  return trim(first_name || ' ' || coalesce(left(last_name, 1) || '.', ''));
end;
$$ language plpgsql immutable;

create or replace view public.public_results as
select
  w.id,
  w.draw_id,
  w.prize_type,
  w.prize_amount,
  w.created_at as draw_date,
  t.ticket_number as winning_ticket_number,
  public.mask_name(u.first_name, u.last_name) as winner_display_name,
  left(w.user_id::text, 8) as winner_public_id, -- privacy-safe partial id
  p.name as product_name,
  p.image_url as product_image
from public.winners w
join public.draws d on d.id = w.draw_id
join public.products p on p.id = d.product_id
left join public.users u on u.id = w.user_id
left join public.tickets t on t.id = w.ticket_id
order by w.created_at desc;

grant select on public.public_results to anon, authenticated;
