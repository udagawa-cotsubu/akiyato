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
  display_name: string | null;
  tag: string | null;
  address: string | null;
  map_url: string | null;
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
    display_name: inn.displayName ?? null,
    tag: inn.tag ?? null,
    address: inn.address ?? null,
    map_url: inn.mapUrl ?? null,
  };
}

function rowToInn(row: InnRow): Inn {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name ?? undefined,
    tag: row.tag ?? undefined,
    address: row.address ?? undefined,
    mapUrl: row.map_url ?? undefined,
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
  const rawSale = row.sale_amount;
  const saleAmount =
    rawSale != null ? (typeof rawSale === "number" ? rawSale : Number(rawSale)) : null;
  const saleAmountNormalized =
    saleAmount != null && !Number.isNaN(saleAmount) ? saleAmount : null;
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
    saleAmount: saleAmountNormalized,
    status: row.status ?? null,
    ratePlan: row.rate_plan ?? null,
  };
}

/** 宿一覧を全件取得 */
export async function getAllInns(): Promise<Inn[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from(TABLE_INNS)
    .select("id, name, display_name, tag, address, map_url")
    .order("display_name", { ascending: true });
  if (error) {
    const pgCode = (error as any).code ?? null;
    const message = error.message ?? "";

    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "lib/lodging/supabaseDb.ts:106",
        message: "getAllInns select error",
        data: { errorMessage: message, errorCode: pgCode, errorDetails: (error as any).details ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // display_name カラムがまだない環境では、後方互換のため name/tag のみで動かす
    if (pgCode === "42703" || message.includes("display_name")) {
      const fallback = await supabase.from(TABLE_INNS).select("id, name, tag").order("name");
      if (fallback.error) {
        throw new Error(`宿一覧の取得に失敗しました: ${fallback.error.message}`);
      }
      const rows = (fallback.data ?? []).map(
        (row) =>
          ({
            ...(row as any),
            display_name: null,
          }) as InnRow,
      );
      return rows.map((row) => rowToInn(row));
    }

    throw new Error(`宿一覧の取得に失敗しました: ${message}`);
  }
  return (data ?? []).map((row) => rowToInn(row as InnRow));
}

/** 単一の宿を削除 */
export async function deleteInn(id: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from(TABLE_INNS).delete().eq("id", id);
  if (error) {
    throw new Error(`宿の削除に失敗しました: ${error.message}`);
  }
}

/** 宿をまとめて保存（同じ ID は上書き） */
export async function saveInns(inns: Inn[]): Promise<void> {
  if (inns.length === 0) return;
  const supabase = getSupabaseBrowser();
  const rows = inns.map(innToRow);
  const { error } = await supabase.from(TABLE_INNS).upsert(rows, { onConflict: "id" });
  if (error) {
    const pgCode = (error as any).code ?? null;
    const message = error.message ?? "";

    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H2",
        location: "lib/lodging/supabaseDb.ts:162",
        message: "saveInns upsert error",
        data: { errorMessage: message, errorCode: pgCode, errorDetails: (error as any).details ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // Supabase のスキーマキャッシュに display_name 列が無い状態では、後方互換として name/tag のみで保存する
    if (pgCode === "42703" || message.includes("display_name") || message.includes("schema cache")) {
      const fallbackRows = inns.map((inn) => ({
        id: inn.id,
        name: inn.name,
        tag: inn.tag ?? null,
      }));
      const fallback = await supabase.from(TABLE_INNS).upsert(fallbackRows, { onConflict: "id" });
      if (fallback.error) {
        throw new Error(`宿の保存に失敗しました: ${fallback.error.message}`);
      }
      return;
    }

    throw new Error(`宿の保存に失敗しました: ${message}`);
  }
}

/** 予約をまとめて保存（同じ airhost_reservation_id は上書き、なければ追加） */
export async function saveReservations(reservations: Reservation[]): Promise<void> {
  if (reservations.length === 0) return;
  const supabase = getSupabaseBrowser();
  const rows = reservations.map(reservationToRow);
  const { error } = await supabase
    .from(TABLE_RESERVATIONS)
    .upsert(rows, { onConflict: "airhost_reservation_id" });
  if (error) throw new Error(`予約の保存に失敗しました: ${error.message}`);
}

const RESERVATIONS_PAGE_SIZE = 1000;

/** 全予約 or 簡易フィルタ付きで取得。options.fetchAll が true のときは1000件ずつページネーションして全件取得する */
export async function getReservations(
  filter?: ReservationFilter,
  options?: { maxRows?: number; fetchAll?: boolean },
): Promise<Reservation[]> {
  const supabase = getSupabaseBrowser();

  const buildQuery = () => {
    let q = supabase.from(TABLE_RESERVATIONS).select("*");
    if (filter?.innId) q = q.eq("inn_id", filter.innId);
    if (filter?.source) q = q.eq("source", filter.source);
    if (filter?.checkInFrom) q = q.gte("check_in", filter.checkInFrom);
    if (filter?.checkInTo) q = q.lte("check_in", filter.checkInTo);
    return q;
  };

  const fetchPage = async (from: number, to: number) => {
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw new Error(`予約一覧の取得に失敗しました: ${error.message}`);
    return (data ?? []).map((row) => rowToReservation(row as ReservationRow));
  };

  let list: Reservation[];

  if (options?.fetchAll || (options?.maxRows != null && options.maxRows > RESERVATIONS_PAGE_SIZE)) {
    list = [];
    const limit = options?.maxRows ?? 100000;
    let offset = 0;
    while (true) {
      const end = Math.min(offset + RESERVATIONS_PAGE_SIZE - 1, limit - 1);
      const page = await fetchPage(offset, end);
      list.push(...page);
      if (page.length < RESERVATIONS_PAGE_SIZE || list.length >= limit) break;
      offset += RESERVATIONS_PAGE_SIZE;
    }
  } else {
    const max = options?.maxRows;
    const { data, error } = await (max != null && max > 0
      ? buildQuery().range(0, max - 1)
      : buildQuery());
    if (error) throw new Error(`予約一覧の取得に失敗しました: ${error.message}`);
    list = (data ?? []).map((row) => rowToReservation(row as ReservationRow));
  }

  if (filter?.searchText) {
    const text = filter.searchText.toLowerCase().trim();
    list = list.filter((r) => {
      const haystack = `${r.source ?? ""} ${r.ratePlan ?? ""}`.toLowerCase();
      return haystack.includes(text);
    });
  }

  return list;
}

/** 予約のみ削除（宿は残す） */
export async function clearReservationsOnly(): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from(TABLE_RESERVATIONS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`予約の削除に失敗しました: ${error.message}`);
}

/** 全データ削除（宿・予約の両方） */
export async function clearAll(): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error: errRes } = await supabase.from(TABLE_RESERVATIONS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errRes) throw new Error(`予約の削除に失敗しました: ${errRes.message}`);
  const { error: errInns } = await supabase.from(TABLE_INNS).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errInns) throw new Error(`宿の削除に失敗しました: ${errInns.message}`);
}
