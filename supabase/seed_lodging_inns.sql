-- lodging_inns を正しいデータで入れ直す
-- Supabase ダッシュボードの SQL Editor で実行してください。
-- 宿名は「001.Sea Side 椿」形式、コード（001,002…）順に並びます。

-- 1. 予約を先に削除（lodging_inns への外部キーがあるため）
delete from public.lodging_reservations;

-- 2. 宿を全削除
delete from public.lodging_inns;

-- 3. 正しい宿データを投入（宿名＝コード.名前、tag＝コード）
insert into public.lodging_inns (name, tag)
values
  ('001.Sea Side 椿', '001'),
  ('002.Sea Side 椿 -はなれ-', '002'),
  ('003.河崎浪漫館', '003'),
  ('004.Active Art Hotel', '004'),
  ('005.癒しの空間 ZEN', '005'),
  ('006.DATE DREAM DATE home', '006'),
  ('007.Sei-Jima Retreat', '007'),
  ('008.ORIGAMI', '008'),
  ('009.奥阿賀七名庵 らくら', '009');
