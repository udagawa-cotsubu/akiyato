-- lodging_inns に住所・Google Map 用URLカラムを追加

alter table public.lodging_inns
  add column if not exists address text,
  add column if not exists map_url text;

comment on column public.lodging_inns.address is '住所（テキスト）';
comment on column public.lodging_inns.map_url is 'Google Map など地図サービスの URL';

