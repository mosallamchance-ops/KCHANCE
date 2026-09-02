-- ============================================================
-- FIX HISTORICAL DATA STILL HOLDING OLD ENGLISH / "$" TEXT
-- The earlier arabic_messages.sql migration only changed what NEW
-- purchases/deposits/wins write going forward — any row already saved
-- before that migration ran still has the old text baked in. This
-- rewrites those existing rows. Safe to run more than once — rows
-- already in Arabic simply won't match the WHERE clauses again.
-- ============================================================

-- Old ticket-purchase transaction descriptions, e.g. "Purchased 3 ticket(s)"
-- or "Purchased 3 selected ticket(s)" -> "تم شراء 3 تذكرة"
update public.transactions
set description = regexp_replace(description, '^Purchased (\d+) selected ticket\(s\)$', 'تم شراء \1 تذكرة')
where description ~ '^Purchased \d+ selected ticket\(s\)$';

update public.transactions
set description = regexp_replace(description, '^Purchased (\d+) ticket\(s\)$', 'تم شراء \1 تذكرة')
where description ~ '^Purchased \d+ ticket\(s\)$';

-- Old deposit-approval ledger description
update public.transactions
set description = 'تمت الموافقة على طلب الشحن'
where description = 'Deposit approved';

-- Old deposit-approval notification (title + message), including the "$" amount
update public.notifications
set title = 'تمت الموافقة على طلب الشحن'
where title = 'Deposit Approved';

update public.notifications
set message = regexp_replace(
  message,
  '^Your deposit request of \$([0-9.]+) was approved and added to your balance\.$',
  'تمت الموافقة على طلب شحن رصيدك بمبلغ \1 ل.س وأُضيف إلى محفظتك.'
)
where message ~ '^Your deposit request of \$';

-- Old winner notification that used "$" instead of "ل.س" for the cash amount
update public.notifications
set message = regexp_replace(
  message,
  'قدرها \$([0-9.]+) وتمت',
  'قدرها \1 ل.س وتمت'
)
where message ~ 'قدرها \$[0-9.]+ وتمت';
