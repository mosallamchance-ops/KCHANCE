-- ============================================================
-- STORAGE BUCKETS — for product images and deposit receipts
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false) -- private: only the uploader and admins should view receipts
on conflict (id) do nothing;

-- Product images: publicly readable (shown on listing pages), only admins can upload.
create policy "Public read product images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "Admins upload product images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.admins where id = auth.uid() and status = 'active')
);

-- Receipts: a user can upload their own receipt; only the uploader or an admin can read it.
create policy "Users upload own receipts"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users read own receipts"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.admins where id = auth.uid() and status = 'active')
  )
);

-- Add the receipt_url column to deposits if not already present (schema.sql has receipt_url, this is a safety no-op)
alter table public.deposits add column if not exists receipt_url text;
