-- B1: scanned products (PRD F22) sync as the `product` collection, keyed by barcode. Its rows live in public.records
-- like every other collection, under the same row level security policies (each user reads and writes only their own
-- rows), so only the collection check widens. docs/TECH-SPEC.md sections 3 and 6.
alter table public.records drop constraint records_collection_check;
alter table public.records add constraint records_collection_check check (collection in
  ('profile','plan','weight','meal','saved','program','slog','checkin','day','food','supplement','product'));
