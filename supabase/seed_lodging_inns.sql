-- 宿管理のモックデータを lodging_inns に投入するスクリプト
-- Supabase ダッシュボードの SQL Editor で実行してください。
-- 2回目以降に実行する場合は、先に「delete from public.lodging_reservations; delete from public.lodging_inns;」で消してから実行するか、重複を許容してください。

insert into public.lodging_inns (name, tag)
values
  ('Sea Side 椿', '001'),
  ('Sea Side 椿 -はなれ-', '002'),
  ('河崎浪漫館', '003'),
  ('Active Art Hotel', '004'),
  ('癒しの空間 ZEN', '005'),
  ('DATE DREAM DATE home', '006'),
  ('Sei-Jima Retreat', '007'),
  ('ORIGAMI', '008'),
  ('奥阿賀七名庵 らくら', '009');
