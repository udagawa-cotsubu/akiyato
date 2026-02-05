-- lodging_inns.display_name を「宿コード(tag) + '.' + 宿名(name)」で自動補完するマイグレーション
-- 005_add_lodging_inns_display_name.sql が未適用の環境でも安全に動作するよう IF NOT EXISTS を利用

-- 列が無ければ追加
alter table public.lodging_inns
  add column if not exists display_name text;

comment on column public.lodging_inns.display_name is 'CSV連携用文字列（宿コード.tag + ''.'' + 宿名.name）';

-- 既存レコードの display_name を補完
update public.lodging_inns
set display_name =
  case
    when coalesce(tag, '') <> '' then tag || '.' || name
    else name
  end
where display_name is null;

