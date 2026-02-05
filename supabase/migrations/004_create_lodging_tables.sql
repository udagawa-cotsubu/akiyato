-- 宿泊ダッシュボード用テーブル（宿・予約）
-- Supabase ダッシュボードの SQL Editor で実行するか、supabase db push で適用してください。

create table if not exists public.lodging_inns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text,
  created_at timestamptz not null default now()
);

create table if not exists public.lodging_reservations (
  id uuid primary key default gen_random_uuid(),
  inn_id uuid not null references public.lodging_inns(id) on delete cascade,
  inn_name text,
  source text,
  airhost_reservation_id text,
  check_in text,
  check_out text,
  nights integer,
  guest_count integer,
  adults integer,
  children integer,
  infants integer,
  nationality text,
  booking_date text,
  sale_amount numeric,
  status text,
  rate_plan text
);

create index if not exists idx_lodging_reservations_inn_id
  on public.lodging_reservations (inn_id);

create index if not exists idx_lodging_reservations_check_in
  on public.lodging_reservations (check_in);

-- 匿名（未ログイン）でも insert / select / update / delete を許可（本番では RLS で制限を推奨）
alter table public.lodging_inns enable row level security;
alter table public.lodging_reservations enable row level security;

drop policy if exists "Allow anon all lodging_inns" on public.lodging_inns;
create policy "Allow anon all lodging_inns"
  on public.lodging_inns for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon all lodging_reservations" on public.lodging_reservations;
create policy "Allow anon all lodging_reservations"
  on public.lodging_reservations for all
  to anon
  using (true)
  with check (true);
