-- Phase 2: 周辺家賃相場・地価坪単価実売用カラム追加
-- 既存レコードは NULL のまま

alter table public.judgements
  add column if not exists surrounding_rent_market text,
  add column if not exists market_data jsonb;

comment on column public.judgements.surrounding_rent_market is '周辺家賃相場・参考賃料（GPT+Web取得）';
comment on column public.judgements.market_data is '地価・坪単価・周辺実売など（GPT+Web または 国交省API）';
