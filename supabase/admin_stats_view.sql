-- ============================================================
-- ADMIN DASHBOARD STATS — aggregated read-only view
-- ============================================================

create or replace view public.admin_stats as
select
  (select count(*) from public.users) as total_users,
  (select count(*) from public.users where status = 'active') as active_users,
  (select coalesce(sum(amount), 0) from public.deposits where status = 'approved') as total_deposited,
  (select coalesce(sum(total_amount), 0) from public.purchases) as total_ticket_sales,
  (select count(*) from public.draws) as total_draws,
  (select count(*) from public.draws where status = 'active') as active_draws,
  (select count(*) from public.draws where status in ('completed')) as completed_draws,
  (select count(*) from public.winners) as total_winners,
  (select coalesce(sum(prize_amount), 0) from public.winners where prize_type = 'cash' and status <> 'completed') as pending_cash_prizes,
  (select count(*) from public.deposits where status = 'pending') as pending_deposits;

-- Admin-only: no anon/authenticated grant. Fetched via the service-role key in API routes only.
