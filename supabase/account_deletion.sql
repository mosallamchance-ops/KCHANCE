-- ============================================================
-- TERMS ACCEPTANCE + ACCOUNT DELETION SUPPORT
-- Run in Supabase → SQL Editor. Safe to run more than once (idempotent).
-- ============================================================

-- Records exactly when a user agreed to the Terms & Privacy Policy at
-- signup — an auditable timestamp, not just a UI checkbox nobody can prove
-- was ever checked.
alter table public.users add column if not exists terms_accepted_at timestamptz;

-- Marks a user-initiated account closure (distinct from admin-suspended,
-- which already uses status = 'suspended' for cause). Tickets, purchases,
-- transactions and winner records are NEVER deleted or touched by this —
-- per the Terms (§15), closing an account does not cancel tickets already
-- bought or refund charged balance, and the platform may still complete
-- processing of any pending draw. Deleting those rows would also violate
-- their foreign keys (tickets/purchases/transactions all reference
-- public.users with no ON DELETE CASCADE — intentionally, so the ledger
-- can never silently lose history).
alter table public.users add column if not exists deleted_at timestamptz;
