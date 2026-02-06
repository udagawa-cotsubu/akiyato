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
    db.getReservations(),
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
  // AirHost予約ID 単位で1レコードにしたいので、既存分をマップ化しておく
  const reservationByAirhostId = new Map<string, Reservation>();
  existingReservations.forEach((r) => {
    if (r.airhostReservationId) {
      reservationByAirhostId.set(r.airhostReservationId, r);
    }
  });

  const normalizedReservations: Reservation[] = [];
  const unknownInnKeys = new Set<string>();

  for (const r of params.reservations) {
    const base = r as Reservation | Omit<Reservation, "id">;
    const airId = base.airhostReservationId;

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
  | "saleAmount"
  | "ratePlan"
  | "status"
  | "source"
>;

/** ブラウザで読み込んだ CSV テキスト群をドメインオブジェクトとして保存する */
export async function importCsvTexts(
  csvTexts: string[],
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

  const summary: ImportedReservationSummary[] = reservations.map((r) => ({
    innName: r.innName,
    bookingDate: r.bookingDate,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    saleAmount: r.saleAmount,
    ratePlan: r.ratePlan,
    status: r.status,
    source: r.source,
  }));

  await upsertInnsAndReservations({ reservations });
  return { reservationsCount: reservations.length, reservationsSummary: summary };
}


