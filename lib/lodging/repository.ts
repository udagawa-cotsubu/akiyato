/**
 * 宿泊ダッシュボード用リポジトリ層
 *
 * - NEXT_PUBLIC_LODGING_USE_SUPABASE=true のときは Supabase、未設定または false のときは IndexedDB を利用
 */

import { v4 as uuidv4 } from "uuid";

import type { Inn, Reservation, ReservationFilter } from "@/lib/types/lodging";
import { mapCsvToDomain, parseCsvText } from "./csvMapping";
import * as localDb from "./localDb";
import * as supabaseDb from "./supabaseDb";

const useSupabase = process.env.NEXT_PUBLIC_LODGING_USE_SUPABASE === "true";
const db = useSupabase ? supabaseDb : localDb;

/** 宿を全件取得 */
export async function fetchInns(): Promise<Inn[]> {
  return db.getAllInns();
}

/** 条件付きで予約一覧を取得 */
export async function fetchReservations(filter?: ReservationFilter): Promise<Reservation[]> {
  return db.getReservations(filter);
}

/** 宿・予約を一括保存（ID がないものには UUID を付与） */
export async function upsertInnsAndReservations(params: {
  inns: Omit<Inn, "id">[] | Inn[];
  reservations: Omit<Reservation, "id">[] | Reservation[];
}): Promise<void> {
  const [existingInns, existingReservations] = await Promise.all([
    db.getAllInns(),
    db.getReservations(),
  ]);

  // --- 宿（Inn）の正規化 ---
  const innByName = new Map<string, Inn>();
  existingInns.forEach((inn) => {
    innByName.set(inn.name, inn);
  });

  const normalizedInns: Inn[] = [];

  for (const innInput of params.inns) {
    const base = innInput as Inn | Omit<Inn, "id">;
    const existing = "id" in base ? base : innByName.get(base.name);
    if (existing) {
      normalizedInns.push(existing);
      continue;
    }

    const created: Inn = {
      id: uuidv4(),
      name: base.name,
      tag: "tag" in base ? base.tag ?? null : null,
    };
    normalizedInns.push(created);
    innByName.set(created.name, created);
  }

  // --- 予約（Reservation）の正規化 ---
  // AirHost予約ID 単位で1レコードにしたいので、既存分をマップ化しておく
  const reservationByAirhostId = new Map<string, Reservation>();
  existingReservations.forEach((r) => {
    if (r.airhostReservationId) {
      reservationByAirhostId.set(r.airhostReservationId, r);
    }
  });

  const normalizedReservations: Reservation[] = [];
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

    // 宿名から innId を補完（既に埋まっている場合は優先）
    let innId = (base as Reservation).innId;
    if (!innId && (base as Reservation).innName) {
      const inn = innByName.get((base as Reservation).innName as string);
      if (inn) {
        innId = inn.id;
      }
    }

    normalizedReservations.push({ ...(base as Reservation), id, innId: innId ?? (base as Reservation).innId });
  }

  // 同一 id が複数回あると Supabase upsert が "cannot affect row a second time" で失敗するため、id で一意にしてから保存
  const uniqueInns = Array.from(new Map(normalizedInns.map((i) => [i.id, i])).values());

  await db.saveInns(uniqueInns);
  if (normalizedReservations.length > 0) {
    await db.saveReservations(normalizedReservations);
  }
}

/** すべての宿・予約を削除 */
export async function resetLodgingData(): Promise<void> {
  await db.clearAll();
}

/** ブラウザで読み込んだ CSV テキスト群をドメインオブジェクトとして保存する */
export async function importCsvTexts(csvTexts: string[]): Promise<void> {
  const inns: Omit<Inn, "id">[] = [];
  const reservations: Omit<Reservation, "id">[] = [];

  for (const text of csvTexts) {
    const rows = parseCsvText(text);
    const mapped = mapCsvToDomain(rows);
    inns.push(...mapped.inns);
    reservations.push(...mapped.reservations);
  }

  if (inns.length === 0 || reservations.length === 0) return;

  await upsertInnsAndReservations({ inns, reservations });
}


