-- 判定結果を保存するテーブル
-- Supabase ダッシュボードの SQL Editor で実行するか、supabase db push で適用してください。

create table if not exists public.judgements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  input jsonb not null,
  output jsonb not null,
  prompt_snapshot jsonb not null,
  status text not null,
  error_message text,
  area_profile jsonb,
  price_feedback jsonb
);

-- 一覧は新しい順で取得するため
create index if not exists idx_judgements_created_at
  on public.judgements (created_at desc);

-- 匿名（未ログイン）でも insert / select / delete を許可する（本番では RLS で制限を推奨）
alter table public.judgements enable row level security;

drop policy if exists "Allow anon insert" on public.judgements;
create policy "Allow anon insert"
  on public.judgements for insert
  to anon
  with check (true);

drop policy if exists "Allow anon select" on public.judgements;
create policy "Allow anon select"
  on public.judgements for select
  to anon
  using (true);

drop policy if exists "Allow anon delete" on public.judgements;
create policy "Allow anon delete"
  on public.judgements for delete
  to anon
  using (true);
