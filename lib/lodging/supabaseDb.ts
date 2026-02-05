/**
 * 宿泊ダッシュボード用 Supabase データ層
 *
 * - localDb と同じ API（getAllInns, saveInns, saveReservations, getReservations, clearAll）を提供
 * - テーブルは snake_case、ドメイン型は camelCase のため変換を行う
 */

import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Inn, Reservation, ReservationFilter } from "@/lib/types/lodging";

const TABLE_INNS = "lodging_inns";
const TABLE_RESERVATIONS = "lodging_reservations";

type InnRow = {
  id: string;
  name: string;
  tag: string | null;
};

type ReservationRow = {
  id: string;
  inn_id: string;
  inn_name: string | null;
  source: string | null;
  airhost_reservation_id: string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  guest_count: number | null;
  adults: number | null;
  children: number | null;
  infants: number | null;
  nationality: string | null;
  booking_date: string | null;
  sale_amount: number | null;
  status: string | null;
  rate_plan: string | null;
};

function innToRow(inn: Inn): InnRow {
  return {
    id: inn.id,
    name: inn.name,
    tag: inn.tag ?? null,
  };
}

function rowToInn(row: InnRow): Inn {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? undefined,
  };
}

function reservationToRow(r: Reservation): ReservationRow {
  return {
    id: r.id,
    inn_id: r.innId,
    inn_name: r.innName ?? null,
    source: r.source ?? null,
    airhost_reservation_id: r.airhostReservationId ?? null,
    check_in: r.checkIn ?? null,
    check_out: r.checkOut ?? null,
    nights: r.nights ?? null,
    guest_count: r.guestCount ?? null,
    adults: r.adults ?? null,
    children: r.children ?? null,
    infants: r.infants ?? null,
    nationality: r.nationality ?? null,
    booking_date: r.bookingDate ?? null,
    sale_amount: r.saleAmount ?? null,
    status: r.status ?? null,
    rate_plan: r.ratePlan ?? null,
  };
}

function rowToReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    innId: row.inn_id,
    innName: row.inn_name ?? null,
    source: row.source ?? null,
    airhostReservationId: row.airhost_reservation_id ?? null,
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    nights: row.nights ?? null,
    guestCount: row.guest_count ?? null,
    adults: row.adults ?? null,
    children: row.children ?? null,
    infants: row.infants ?? null,
    nationality: row.nationality ?? null,
    bookingDate: row.booking_date ?? null,
    saleAmount: row.sale_amount ?? null,
    status: row.status ?? null,
    ratePlan: row.rate_plan ?? null,
  };
}

/** 宿一覧を全件取得 */
export async function getAllInns(): Promise<Inn[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.from(TABLE_INNS).select("id, name, tag").order("name");
  if (error) throw new Error(`宿一覧の取得に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => rowToInn(row as InnRow));
}

/** 宿をまとめて保存（同じ ID は上書き） */
export async function saveInns(inns: Inn[]): Promise<void> {
  if (inns.length === 0) return;
  const supabase = getSupabaseBrowser();
  const rows = inns.map(innToRow);
  const { error } = await supabase.from(TABLE_INNS).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`宿の保存に失敗しました: ${error.message}`);
}

/** 予約をまとめて保存（同じ ID は上書き） */
export async function saveReservations(reservations: Reservation[]): Promise<void> {
  if (reservations.length === 0) return;
  const supabase = getSupabaseBrowser();
  const rows = reservations.map(reservationToRow);
  const { error } = await supabase.from(TABLE_RESERVATIONS).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`予約の保存に失敗しました: ${error.message}`);
}

/** 全予約 or 簡易フィルタ付きで取得 */
export async function getReservations(filter?: ReservationFilter): Promise<Reservation[]> {
  const supabase = getSupabaseBrowser();
  let query = supabase.from(TABLE_RESERVATIONS).select("*");

  if (filter?.innId) {
    query = query.eq("inn_id", filter.innId);
  }
  if (filter?.source) {
    query = query.eq("source", filter.source);
  }
  if (filter?.checkInFrom) {
    query = query.gte("check_in", filter.checkInFrom);
  }
  if (filter?.checkInTo) {
    query = query.lte("check_in", filter.checkInTo);
  }

  const { data, error } = await query;
  if (error) throw new Error(`予約一覧の取得に失敗しました: ${error.message}`);

  let list = (data ?? []).map((row) => rowToReservation(row as ReservationRow));

  if (filter?.searchText) {
    const text = filter.searchText.toLowerCase().trim();
    list = list.filter((r) => {
      const haystack = `${r.source ?? ""} ${r.ratePlan ?? ""}`.toLowerCase();
      return haystack.includes(text);
    });
  }

  return list;
}

/** 全データ削除（宿・予約の両方） */
export async function clearAll(): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error: errRes } = await supabase.from(TABLE_RESERVATIONS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errRes) throw new Error(`予約の削除に失敗しました: ${errRes.message}`);
  const { error: errInns } = await supabase.from(TABLE_INNS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errInns) throw new Error(`宿の削除に失敗しました: ${errInns.message}`);
}
