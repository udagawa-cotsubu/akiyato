-- 周辺家賃相場の参照元（国交省に家賃APIはないため現状は web のみ）
alter table public.judgements
  add column if not exists surrounding_rent_source text;

comment on column public.judgements.surrounding_rent_source is '周辺家賃相場の参照元: mlit / web';
