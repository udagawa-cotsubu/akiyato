-- lodging_inns に display_name を追加（CSV取り込み時の文字列一致用 001.〇〇）
-- name = 本来の名前、display_name = 001.〇〇 形式で管理

alter table public.lodging_inns
  add column if not exists display_name text;

comment on column public.lodging_inns.name is '宿の本来の名前';
comment on column public.lodging_inns.display_name is 'CSV取り込み時の文字列一致用（例: 001.Sea Side 椿）';
comment on column public.lodging_inns.tag is 'コード（例: 001）';
