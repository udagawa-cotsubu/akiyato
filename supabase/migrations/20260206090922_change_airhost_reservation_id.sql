-- airhost_reservation_id は text のままとする（bigint にはしない）
-- 重複禁止は 009_dedupe_airhost_reservation_id_add_unique.sql で実施
SELECT 1;
