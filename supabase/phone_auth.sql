-- ============================================================
-- PHONE-BASED REGISTRATION: auto-create a public.users row
-- Run in Supabase → SQL Editor. Safe to run more than once (idempotent).
-- ============================================================

-- When someone verifies a phone OTP for the first time, Supabase creates a
-- row in the built-in auth.users table. The rest of this app (balance,
-- tickets, profile, etc.) all reads/writes public.users instead, so without
-- this trigger a brand-new phone signup would have no profile row at all
-- until something happened to upsert one — this makes it immediate and
-- automatic, matching the standard Supabase "new user" pattern.
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
