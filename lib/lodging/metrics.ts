import { v4 as uuidv4 } from "uuid";

import type { Reservation, ReservationFilter, StayNight } from "@/lib/types/lodging";

export interface WeeklyAdrPoint {
  weekKey: string;
  innId: string;
  innName: string | null;
  totalSaleAmount: number;
  totalNights: number;
  adr: number;
}

/** 予約リストから宿×週のADR（販売金額合計÷宿泊数＝1泊あたりの単価）を計算する。キャンセル・ブロックは除外 */
export function buildWeeklyAdr(
  reservations: Reservation[],
  filter?: ReservationFilter
): WeeklyAdrPoint[] {
  const checkInFrom = filter?.checkInFrom;
  const checkInTo = filter?.checkInTo;
  const innId = filter?.innId;
  const source = filter?.source;

  const map = new Map<string, { totalSale: number; totalNights: number; innId: string; innName: string | null }>();

  for (const r of reservations) {
    if (r.status === "キャンセル" || r.status === "ブロック") continue;
    if (!r.checkIn) continue;
    if (innId && r.innId !== innId) continue;
    if (source && r.source && r.source !== source) continue;
    if (checkInFrom && r.checkIn < checkInFrom) continue;
    if (checkInTo && r.checkIn > checkInTo) continue;

    const { key: weekKey } = dateToWeekKey(r.checkIn);
    if (weekKey === "invalid") continue;

    const compositeKey = `${r.innId}__${weekKey}`;
    const sale = r.saleAmount != null ? r.saleAmount : 0;
    const nights = r.nights != null ? r.nights : 0;
    const current = map.get(compositeKey);
    if (!current) {
      map.set(compositeKey, {
        totalSale: sale,
        totalNights: nights,
        innId: r.innId,
        innName: r.innName,
      });
    } else {
      current.totalSale += sale;
      current.totalNights += nights;
    }
  }

  const result: WeeklyAdrPoint[] = [];
  for (const [compositeKey, v] of map) {
    const [, weekKey] = compositeKey.split("__");
    result.push({
      weekKey,
      innId: v.innId,
      innName: v.innName,
      totalSaleAmount: v.totalSale,
      totalNights: v.totalNights,
      adr: v.totalNights > 0 ? v.totalSale / v.totalNights : 0,
    });
  }

  return result.sort((a, b) => {
    const aMatch = /^([0-9]{4})\s+([0-9]+)W$/.exec(a.weekKey);
    const bMatch = /^([0-9]{4})\s+([0-9]+)W$/.exec(b.weekKey);
    if (!aMatch || !bMatch) return 0;
    if (Number(aMatch[1]) !== Number(bMatch[1])) return Number(aMatch[1]) - Number(bMatch[1]);
    return Number(aMatch[2]) - Number(bMatch[2]);
  });
}

export interface WeeklySalesPoint {
  weekKey: string;
  innId: string;
  innName: string | null;
  totalSaleAmount: number;
}

/** 予約リストから宿×週の販売金額合計を計算する。キャンセル・ブロックは除外 */
export function buildWeeklySales(
  reservations: Reservation[],
  filter?: ReservationFilter
): WeeklySalesPoint[] {
  const checkInFrom = filter?.checkInFrom;
  const checkInTo = filter?.checkInTo;
  const innId = filter?.innId;
  const source = filter?.source;

  const map = new Map<string, { totalSale: number; innId: string; innName: string | null }>();

  for (const r of reservations) {
    if (r.status === "キャンセル" || r.status === "ブロック") continue;
    if (!r.checkIn) continue;
    if (innId && r.innId !== innId) continue;
    if (source && r.source && r.source !== source) continue;
    if (checkInFrom && r.checkIn < checkInFrom) continue;
    if (checkInTo && r.checkIn > checkInTo) continue;

    const { key: weekKey } = dateToWeekKey(r.checkIn);
    if (weekKey === "invalid") continue;

    const compositeKey = `${r.innId}__${weekKey}`;
    const sale = r.saleAmount != null ? r.saleAmount : 0;
    const current = map.get(compositeKey);
    if (!current) {
      map.set(compositeKey, {
        totalSale: sale,
        innId: r.innId,
        innName: r.innName,
      });
    } else {
      current.totalSale += sale;
    }
  }

  const result: WeeklySalesPoint[] = [];
  for (const [compositeKey, v] of map) {
    const [, weekKey] = compositeKey.split("__");
    result.push({
      weekKey,
      innId: v.innId,
      innName: v.innName,
      totalSaleAmount: v.totalSale,
    });
  }

  return result.sort((a, b) => {
    const aMatch = /^([0-9]{4})\s+([0-9]+)W$/.exec(a.weekKey);
    const bMatch = /^([0-9]{4})\s+([0-9]+)W$/.exec(b.weekKey);
    if (!aMatch || !bMatch) return 0;
    if (Number(aMatch[1]) !== Number(bMatch[1])) return Number(aMatch[1]) - Number(bMatch[1]);
    return Number(aMatch[2]) - Number(bMatch[2]);
  });
}

/** Reservation から 1泊単位の StayNight 配列を生成する */
export function buildStayNights(reservations: Reservation[], filter?: ReservationFilter): StayNight[] {
  const result: StayNight[] = [];

  const checkInFrom = filter?.checkInFrom;
  const checkInTo = filter?.checkInTo;
  const innId = filter?.innId;
  const source = filter?.source;

  for (const r of reservations) {
    // キャンセル・ブロックは稼働率計算から除外
    if (r.status === "キャンセル" || r.status === "ブロック") continue;

    if (!r.checkIn || !r.nights || r.nights <= 0) continue;

    if (innId && r.innId !== innId) continue;
    if (source && r.source && r.source !== source) continue;

    // チェックインベースの期間フィルタ（StayNight 単位ではなく、予約単位で粗く絞り込み）
    if (checkInFrom && r.checkIn < checkInFrom) continue;
    if (checkInTo && r.checkIn > checkInTo) continue;

    const baseDate = new Date(r.checkIn);
    if (Number.isNaN(baseDate.getTime())) continue;

    for (let i = 0; i < r.nights; i += 1) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      // ローカル日付で YYYY-MM-DD（toISOString は UTC のためタイムゾーンで日付がずれるのを防ぐ）
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const date = `${y}-${m}-${day}`;

      result.push({
        id: uuidv4(),
        innId: r.innId,
        reservationId: r.id,
        innName: r.innName,
        source: r.source,
        date,
        status: r.status,
      });
    }
  }

  return result;
}

/** 日付文字列（YYYY-MM-DD）から {year, week, key} を算出する（簡易実装: 1/1 から7日ごと）。ローカル日付として解釈 */
export function dateToWeekKey(dateStr: string): { year: number; week: number; key: string } {
  const parts = dateStr.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return { year: 0, week: 0, key: "invalid" };
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const diffMs = d.getTime() - jan1.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const week = Math.min(53, Math.max(1, Math.floor(diffDays / 7) + 1));
    return { year, week, key: `${year} ${week}W` };
  }
  const [y, m, day] = parts;
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return { year: 0, week: 0, key: "invalid" };
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const diffMs = d.getTime() - jan1.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.min(53, Math.max(1, Math.floor(diffDays / 7) + 1));
  const key = `${year} ${week}W`;
  return { year, week, key };
}

/** ダッシュボード用の週キー一覧（2024年1W〜2027年1W）を返す */
export function getDashboardWeekRange(): string[] {
  const result: string[] = [];
  for (const year of [2024, 2025, 2026]) {
    for (let w = 1; w <= 53; w += 1) {
      result.push(`${year} ${w}W`);
    }
  }
  result.push("2027 1W");
  return result;
}

export interface WeeklyOccupancyPoint {
  weekKey: string;
  innId: string;
  innName: string | null;
  stayedNights: number;
  occupancy: number;
  /** 並び替え用（内部） */
  year: number;
  /** 並び替え用（内部） */
  week: number;
}

/** StayNight 配列から宿×週の稼働率を計算する */
export function buildWeeklyOccupancy(stayNights: StayNight[]): WeeklyOccupancyPoint[] {
  const map = new Map<string, WeeklyOccupancyPoint>();

  for (const sn of stayNights) {
    const { year, week, key: weekKey } = dateToWeekKey(sn.date);
    if (weekKey === "invalid") continue;

    const compositeKey = `${sn.innId}__${weekKey}`;
    const current = map.get(compositeKey);
    if (!current) {
      map.set(compositeKey, {
        weekKey,
        innId: sn.innId,
        innName: sn.innName,
        stayedNights: 1,
        occupancy: 0,
        year,
        week,
      });
    } else {
      current.stayedNights += 1;
    }
  }

  for (const point of map.values()) {
    const raw = point.stayedNights / 7;
    point.occupancy = raw > 1 ? 1 : raw;
  }

  const result = Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  });

  return result;
}

