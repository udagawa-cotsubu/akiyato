/**
 * 宿泊CSVのマッピング・不要カラム定義
 *
 * - 1行目ヘッダ行を基準にオブジェクト化
 * - ユーザー指定の不要カラムはここで定義して除外
 */

import type { Inn, Reservation } from "@/lib/types/lodging";
import Papa from "papaparse";

/** インポート時に無視するカラム（ヘッダ名） */
export const EXCLUDED_COLUMNS: string[] = [
  "チャンネル予約ID",
  "部屋番号",
  "ゲスト名",
  "電話番号",
  "メールアドレス",
  "ゲストアドレス",
  "チェックイン状態",
  "支払い済み",
  "通貨",
  "OTA サービス料",
  "受取金",
  "支払済み（補助金/クーポン）",
  "OTA 決済",
  "クレジット",
  "現金",
  "未収",
  "クリーニング代",
  "サポート料金",
  "コメント",
  "説明",
  "決済手数料",
  "予約エンジンクーポン",
  "宿泊者名",
  "更新日時",
  "ルームタイプメニュー",
  "キャンセル",
];

/** CSVパーサ（Papaparseでカンマ・改行・ダブルクオート対応） */
export function parseCsvText(text: string): string[][] {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });

  const rows = (result.data ?? []).filter((row) => row.length > 0);

  const headerLen = rows[0]?.length ?? 0;
  const sampleLengths = rows.slice(0, 10).map((r) => r.length);

  if (process.env.NODE_ENV !== "production") {
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "csv-debug",
        hypothesisId: "CSV_H1",
        location: "lib/lodging/csvMapping.ts:parseCsvText",
        message: "Parsed CSV row lengths (first 10)",
        data: { headerLen, sampleLengths, totalRows: rows.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
  }

  return rows;
}

/** 通知用にのみ使うゲスト名（DBには保存しない） */
export type ReservationWithGuestNameForNotification = Omit<Reservation, "id"> & {
  guestNameForNotification?: string | null;
};

/** CSV 1枚分を Inn / Reservation 配列に変換する */
export function mapCsvToDomain(rows: string[][]): {
  inns: Omit<Inn, "id">[];
  reservations: ReservationWithGuestNameForNotification[];
} {
  if (rows.length <= 1) {
    return { inns: [], reservations: [] };
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndex: Record<string, number> = {};
  headerRow.forEach((name, index) => {
    headerIndex[name] = index;
  });

  const get = (row: string[], headerName: string): string | null => {
    const idx = headerIndex[headerName];
    if (idx === undefined) return null;
    const raw = row[idx]?.trim();
    return raw === "" ? null : raw;
  };

  const toNumber = (value: string | null): number | null => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const normalizeSource = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed === "手動でインポート") return "OTA不明";

    const lower = trimmed.toLowerCase();
    if (
      lower.includes("手動作成") ||
      lower.includes("airhost") // "AirHost" / "airhost" 両対応
    ) {
      return "自社予約";
    }

    return trimmed;
  };

  const normalizeStatus = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed === "システムキャンセル" || trimmed === "キャンセル") return "キャンセル";
    if (trimmed === "ブロックされた") return "ブロック";
    if (trimmed === "確認済み") return null;
    return trimmed;
  };

  const innsByName = new Map<string, Omit<Inn, "id">>();
  const reservations: ReservationWithGuestNameForNotification[] = [];

  let skippedByLength = 0;

  for (const row of dataRows) {
    if (row.length !== headerRow.length) {
      skippedByLength += 1;
      continue;
    }

    const innName = get(row, "物件名");
    if (!innName) continue;

    let inn = innsByName.get(innName);
    if (!inn) {
      inn = {
        name: innName,
        tag: get(row, "物件タグ"),
      };
      innsByName.set(innName, inn);
    }

    const channel = normalizeSource(get(row, "予約サイト"));
    const airhostId = get(row, "AirHost予約ID");
    const checkIn = get(row, "チェックイン");
    const checkOut = get(row, "チェックアウト");
    const nights = toNumber(get(row, "合計日数"));
    const guests = toNumber(get(row, "ゲスト数"));
    const adults = toNumber(get(row, "大人"));
    const children = toNumber(get(row, "子供"));
    const infants = toNumber(get(row, "幼児"));
    const nationality = get(row, "国籍");
    const bookingDateRaw = get(row, "予約日");
    const bookingDate =
      bookingDateRaw && bookingDateRaw.length >= 10 ? bookingDateRaw.slice(0, 10) : bookingDateRaw;
    const saleAmount = toNumber(get(row, "販売"));
    const ratePlan = get(row, "料金プラン");
    const status = normalizeStatus(get(row, "状態"));
    const guestNameForNotification = get(row, "ゲスト名") ?? get(row, "宿泊者名") ?? null;

    reservations.push({
      innId: "",
      innName,
      source: channel,
      airhostReservationId: airhostId,
      checkIn,
      checkOut,
      nights,
      guestCount: guests,
      adults,
      children,
      infants,
      nationality,
      bookingDate,
      saleAmount,
      status,
      ratePlan,
      guestNameForNotification: guestNameForNotification || undefined,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "csv-debug",
        hypothesisId: "CSV_H2",
        location: "lib/lodging/csvMapping.ts:mapCsvToDomain",
        message: "Mapped CSV to domain",
        data: {
          headerLen: headerRow.length,
          totalRows: rows.length,
          dataRows: dataRows.length,
          innsCount: innsByName.size,
          reservationsCount: reservations.length,
          skippedByLength,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
  }

  return {
    inns: Array.from(innsByName.values()),
    reservations,
  };
}

