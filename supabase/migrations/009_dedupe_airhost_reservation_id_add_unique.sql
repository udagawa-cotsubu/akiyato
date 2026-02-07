-- lodging_reservations.airhost_reservation_id を text のまま重複禁止にする
-- 同じ airhost_reservation_id のうち、id が最大の行を1件だけ残し、それ以外を削除する

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

-- 型が bigint になっている場合は text に戻す（既に text ならそのまま）
ALTER TABLE public.lodging_reservations
  ALTER COLUMN airhost_reservation_id TYPE text USING airhost_reservation_id::text;

-- UNIQUE 制約を追加（NULL は複数可）
ALTER TABLE public.lodging_reservations
  ADD CONSTRAINT lodging_reservations_airhost_reservation_id_key
  UNIQUE (airhost_reservation_id);
