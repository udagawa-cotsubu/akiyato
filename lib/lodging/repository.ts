/**
 * 宿泊ダッシュボード用リポジトリ層
 *
 * - 現在は常に Supabase を利用して宿／予約データを保存する
 */

import { v4 as uuidv4 } from "uuid";

import type { Inn, Reservation, ReservationFilter } from "@/lib/types/lodging";
import { mapCsvToDomain, parseCsvText } from "./csvMapping";
import * as supabaseDb from "./supabaseDb";

const db = supabaseDb;

/** 宿を全件取得 */
export async function fetchInns(): Promise<Inn[]> {
  return db.getAllInns();
}

/** 宿を新規追加 */
export async function createInn(input: Omit<Inn, "id">): Promise<Inn> {
  const code = input.tag?.trim() || null;
  const inn: Inn = {
    id: uuidv4(),
    name: input.name,
    tag: code,
    displayName: code ? `${code}.${input.name}` : input.name,
    address: input.address ?? null,
    mapUrl: input.mapUrl ?? null,
  };
  await db.saveInns([inn]);
  return inn;
}

/** 宿を更新 */
export async function updateInn(inn: Inn): Promise<void> {
  const code = inn.tag?.trim() || null;
  const updated: Inn = {
    ...inn,
    tag: code,
    displayName: code ? `${code}.${inn.name}` : inn.name,
  };
  await db.saveInns([updated]);
}

/** 宿を削除 */
export async function deleteInn(id: string): Promise<void> {
  await db.deleteInn(id);
}

/** 条件付きで予約一覧を取得 */
export async function fetchReservations(filter?: ReservationFilter): Promise<Reservation[]> {
  return db.getReservations(filter);
}

/** 宿・予約を一括保存（ID がないものには UUID を付与） */
export async function upsertInnsAndReservations(params: {
  reservations: Omit<Reservation, "id">[] | Reservation[];
}): Promise<void> {
  const [existingInns, existingReservations] = await Promise.all([
    db.getAllInns(),
    db.getReservations(undefined, { fetchAll: true }),
  ]);

  // --- 宿（Inn）の解決 ---
  // CSV 側の「csv連携用文字列」（= Reservation.innName）と Inn.displayName が完全一致する場合のみ紐付ける
  const innByMatchKey = new Map<string, Inn>();
  existingInns.forEach((inn) => {
    if (inn.displayName) {
      innByMatchKey.set(inn.displayName, inn);
    }
  });

  // --- 予約（Reservation）の正規化 ---
  // airhost_reservation_id で既存を探し、一致すれば上書き・なければ追加（キーは正規化して突き合わせ）
  const airhostIdKey = (v: string | null | undefined): string | null => {
    if (v == null || v === "") return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };
  const reservationByAirhostId = new Map<string, Reservation>();
  existingReservations.forEach((r) => {
    const key = airhostIdKey(r.airhostReservationId);
    if (key != null) reservationByAirhostId.set(key, r);
  });

  const normalizedReservations: Reservation[] = [];
  const unknownInnKeys = new Set<string>();

  for (const r of params.reservations) {
    const base = r as Reservation | Omit<Reservation, "id">;
    const airIdRaw = base.airhostReservationId;
    const airId = airhostIdKey(airIdRaw);

    let id: string;
    if (airId && reservationByAirhostId.has(airId)) {
      // 既存レコードがあれば、その ID を引き継いで上書き
      id = reservationByAirhostId.get(airId)!.id;
    } else if (airId) {
      // 新しい AirHost予約ID の場合は新規 ID を発行し、マップにも登録
      id = uuidv4();
      reservationByAirhostId.set(airId, { ...(base as Reservation), id });
    } else {
      // AirHost予約ID が無いレコードは通常通り新規扱い
      id = "id" in base ? base.id : uuidv4();
    }

    // CSV 上の「csv連携用文字列」（Reservation.innName）から、必ず既存の宿を解決する
    const csvKey = (base as Reservation).innName?.trim() ?? "";
    const matchedInn = csvKey ? innByMatchKey.get(csvKey) : undefined;
    if (!matchedInn) {
      if (csvKey) {
        unknownInnKeys.add(csvKey);
      }
      continue;
    }

    normalizedReservations.push({
      ...(base as Reservation),
      id,
      innId: matchedInn.id,
      // 表示用の innName は宿マスタの本来の名前で上書きしておく
      innName: matchedInn.name,
    });
  }

  if (unknownInnKeys.size > 0) {
    const samples = Array.from(unknownInnKeys).slice(0, 5);
    const more = unknownInnKeys.size > samples.length ? `（ほか ${unknownInnKeys.size - samples.length} 件）` : "";
    throw new Error(
      `CSV の「宿連携用文字列」に対応する宿が見つからない行があります。\n` +
        `宿管理画面で以下の文字列を「csv連携用文字列」として登録してから、再度インポートしてください。\n` +
        `未登録の文字列: ${samples.join(", ")}${more}`,
    );
  }

  if (normalizedReservations.length > 0) {
    await db.saveReservations(normalizedReservations);
  }
}

/** 予約のみ削除（宿は残す） */
export async function resetReservationsOnly(): Promise<void> {
  await db.clearReservationsOnly();
}

/** すべての宿・予約を削除 */
export async function resetLodgingData(): Promise<void> {
  await db.clearAll();
}

export type ImportedReservationSummary = Pick<
  Reservation,
  | "innName"
  | "bookingDate"
  | "checkIn"
  | "checkOut"
  | "nights"
  | "adults"
  | "children"
  | "infants"
  | "saleAmount"
  | "ratePlan"
  | "status"
  | "source"
  | "airhostReservationId"
>;

/** ブラウザで読み込んだ CSV テキスト群をドメインオブジェクトとして保存する */
export async function importCsvTexts(
  csvTexts: string[],
  options?: { importSourceType?: "checkin" | "reservation" | "cancel" },
): Promise<{ reservationsCount: number; reservationsSummary: ImportedReservationSummary[] }> {
  const reservations: Omit<Reservation, "id">[] = [];

  for (const text of csvTexts) {
    const rows = parseCsvText(text);
    const mapped = mapCsvToDomain(rows);
    reservations.push(...mapped.reservations);
  }

  if (reservations.length === 0) {
    return { reservationsCount: 0, reservationsSummary: [] };
  }

  const airhostIdKeyForLookup = (v: string | null | undefined): string | null => {
    if (v == null || v === "") return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  let existingByAirhostId: Map<string, Reservation> | undefined;

  if (options?.importSourceType === "cancel") {
    // キャンセル突き合わせ用に全件取得（1000件ずつページネーション）
    const existingReservations = await db.getReservations(undefined, {
      fetchAll: true,
    });
    existingByAirhostId = new Map();
    existingReservations.forEach((r) => {
      const key = airhostIdKeyForLookup(r.airhostReservationId);
      if (key != null) {
        existingByAirhostId!.set(key, r);
      }
    });
  }

  const summary: ImportedReservationSummary[] = reservations.map((r) => {
    const lookupKey = airhostIdKeyForLookup(r.airhostReservationId);
    const existing =
      existingByAirhostId && lookupKey != null
        ? existingByAirhostId.get(lookupKey)
        : undefined;

    // キャンセル時は通知用に「既存予約の販売金額 × -1」を表示（同じデータ＝上書き対象の金額）
    let baseSaleAmount: number | null;
    if (options?.importSourceType === "cancel") {
      const raw = existing?.saleAmount;
      baseSaleAmount = raw != null ? Number(raw) : null;
      if (baseSaleAmount !== null && Number.isNaN(baseSaleAmount)) baseSaleAmount = null;
    } else {
      baseSaleAmount = r.saleAmount ?? null;
    }

    const saleAmountForNotification =
      options?.importSourceType === "cancel" && baseSaleAmount != null
        ? baseSaleAmount * -1
        : baseSaleAmount;

    return {
      innName: r.innName,
      bookingDate: r.bookingDate,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      nights: r.nights,
      adults: r.adults,
      children: r.children,
      infants: r.infants,
      saleAmount: saleAmountForNotification,
      ratePlan: r.ratePlan,
      status: r.status,
      source: r.source,
      airhostReservationId: r.airhostReservationId,
    };
  });

  // キャンセル取り込み時はDBには販売金額 0 で保存する（通知には上記で既存金額×-1を出している）
  const reservationsForSave: (Omit<Reservation, "id"> | Reservation)[] =
    options?.importSourceType === "cancel"
      ? reservations.map((r) => ({ ...r, saleAmount: 0 }))
      : reservations;

  await upsertInnsAndReservations({ reservations: reservationsForSave });
  return { reservationsCount: reservations.length, reservationsSummary: summary };
}


