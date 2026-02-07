-- airhost_reservation_id を text にし、重複禁止にする（既に bigint のDB用）
-- 重複は id が最大の1件だけ残す

DELETE FROM public.lodging_reservations lr
USING (
  SELECT
    id,
    airhost_reservation_id,
    ROW_NUMBER() OVER (
      PARTITION BY airhost_reservation_id
      ORDER BY id DESC
    ) AS rn
  FROM public.lodging_reservations
  WHERE airhost_reservation_id IS NOT NULL
) d
WHERE lr.id = d.id
  AND d.rn > 1;

-- bigint → text に変更（既に text ならそのまま）
ALTER TABLE public.lodging_reservations
  ALTER COLUMN airhost_reservation_id TYPE text USING airhost_reservation_id::text;

-- 既存の UNIQUE 制約があれば削除してから追加
ALTER TABLE public.lodging_reservations
  DROP CONSTRAINT IF EXISTS lodging_reservations_airhost_reservation_id_key;

ALTER TABLE public.lodging_reservations
  ADD CONSTRAINT lodging_reservations_airhost_reservation_id_key
  UNIQUE (airhost_reservation_id);
