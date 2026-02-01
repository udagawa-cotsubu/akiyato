-- Phase 1: 判定の実際の結果（アウトカム）記録用カラム追加
-- 既存レコードは NULL のまま

alter table public.judgements
  add column if not exists outcome_status text,
  add column if not exists outcome_score smallint,
  add column if not exists outcome_note text,
  add column if not exists outcome_at timestamptz;

comment on column public.judgements.outcome_status is '結果: pending=未記録, visited=訪問, passed=見送り, acquired=買取';
comment on column public.judgements.outcome_score is '事後のスコア（1-5など、任意）';
comment on column public.judgements.outcome_note is '結果の自由メモ';
comment on column public.judgements.outcome_at is '結果を記録した日時';

-- 結果（アウトカム）の更新を許可
create policy "Allow anon update"
  on public.judgements for update
  to anon
  using (true)
  with check (true);
