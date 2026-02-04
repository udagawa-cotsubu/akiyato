import { gunzipSync } from "zlib";
import type { MarketData, PriceTableRow } from "@/lib/types/judgement";
import {
  reinfolibLogRequest,
  reinfolibLogResponse,
  reinfolibLogParsed,
  reinfolibLogXIT001Body,
} from "@/lib/reinfolib/log";

const REINFOLIB_BASE = "https://www.reinfolib.mlit.go.jp/ex-api/external/";

function getApiKey(): string | null {
  return process.env.REINFOLIB_MLIT_API_KEY?.trim() ?? null;
}

function getHeaders(): Record<string, string> {
  const key = getApiKey();
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
  };
  if (key) {
    headers["Ocp-Apim-Subscription-Key"] = key;
  }
  return headers;
}

/**
 * 不動産情報ライブラリ API に GET リクエストを送り、JSON を返す。
 * レスポンスが gzip の場合はデコードする。
 * @param pathWithQuery パスとクエリ（例: XIT001?year=2025&area=13）
 * @param api ログ用のAPI名（例: XIT001, XIT002）
 */
export async function fetchReinfolib(
  pathWithQuery: string,
  api?: string
): Promise<unknown> {
  const key = getApiKey();
  if (!key) {
    throw new Error("REINFOLIB_MLIT_API_KEY が設定されていません。");
  }
  const url = pathWithQuery.startsWith("http") ? pathWithQuery : `${REINFOLIB_BASE}${pathWithQuery}`;
  const queryString = pathWithQuery.includes("?") ? pathWithQuery.split("?")[1] ?? "" : "";
  const params: Record<string, string> = {};
  try {
    new URLSearchParams(queryString).forEach((v, k) => {
      params[k] = v;
    });
  } catch {
    // ignore
  }
  if (api) {
    reinfolibLogRequest(api, url, params);
  }
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    if (api) {
      reinfolibLogResponse(api, {
        status: res.status,
        ok: false,
        errorBodySnippet: text.slice(0, 500),
        errorMessage: text.includes("検索結果がありません") ? "検索結果がありません" : undefined,
      });
    }
    if (res.status === 404 && text.includes("検索結果がありません")) {
      throw new Error("REINFOLIB_NO_RESULTS");
    }
    throw new Error(`REINFOLIB API error: ${res.status} ${text.slice(0, 200)}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const encoding = res.headers.get("content-encoding") ?? "";
  const buffer = Buffer.from(await res.arrayBuffer());
  let jsonBuffer = buffer;
  if (encoding.toLowerCase().includes("gzip") && buffer.length > 0) {
    try {
      jsonBuffer = gunzipSync(buffer);
    } catch {
      // gzip でない場合そのまま
    }
  }
  if (api) {
    reinfolibLogResponse(api, {
      status: res.status,
      ok: true,
      bodyLength: jsonBuffer.length,
    });
  }
  const text = jsonBuffer.toString("utf-8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`REINFOLIB API: JSON parse error (content-type: ${contentType})`);
  }
}

/** XIT002 市区町村一覧の1件 */
export interface ReinfolibCity {
  id: string;
  name: string;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value != null && typeof value === "object" && "results" in value) {
    const r = (value as { results?: unknown }).results;
    return Array.isArray(r) ? r : [];
  }
  if (value != null && typeof value === "object" && "data" in value) {
    const d = (value as { data?: unknown }).data;
    return Array.isArray(d) ? d : [];
  }
  return [];
}

/**
 * 都道府県内市区町村一覧を取得（XIT002）。
 * @param areaCode 都道府県コード（2桁、01〜47）
 */
export async function getCities(areaCode: string): Promise<ReinfolibCity[]> {
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "lib/reinfolib/client.ts:getCities", message: "getCities entry", data: { areaCode }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H5" }) }).catch(() => {});
  // #endregion
  const code = String(areaCode).padStart(2, "0").slice(0, 2);
  const pathWithQuery = `XIT002?area=${code}&language=ja`;
  const data = await fetchReinfolib(pathWithQuery, "XIT002");
  const arr = asArray(data);
  const cities = arr
    .filter((row): row is { id?: string; name?: string } => row != null && typeof row === "object")
    .map((row) => ({
      id: String(row.id ?? ""),
      name: String(typeof row.name === "object" && row.name !== null && "ja" in row.name ? (row.name as { ja?: string }).ja ?? "" : row.name ?? ""),
    }))
    .filter((c) => c.id && c.name);
  reinfolibLogParsed("XIT002", { cityCount: cities.length });
  return cities;
}

/** XIT001 取引価格・成約価格の1件（利用するフィールドのみ） */
export interface XIT001Record {
  TradePrice?: number;
  PricePerUnit?: number;
  /** 取引時点（APIで返る場合。例: 2025-Q3） */
  Period?: string;
  Type?: string;
  Region?: string;
  Municipality?: string;
  DistrictName?: string;
  DistrictNameReading?: string;
  Area?: number;
  FloorPlan?: string;
  BuildingYear?: string;
  Structure?: string;
}

/**
 * 市区町村名から市区町村コードを取得する（XIT002 の結果からマッチ）。
 * 完全一致 → 前方一致 → 含む の順で試す。
 */
export function matchCityCode(cities: ReinfolibCity[], cityName: string): string | null {
  const normalized = (cityName ?? "").trim().replace(/\s+/g, "");
  if (!normalized) return null;
  const exact = cities.find((c) => c.name === normalized || c.name.replace(/\s+/g, "") === normalized);
  if (exact) return exact.id;
  const starts = cities.find((c) => normalized.startsWith(c.name) || c.name.startsWith(normalized));
  if (starts) return starts.id;
  const includes = cities.find((c) => normalized.includes(c.name) || c.name.includes(normalized));
  return includes?.id ?? null;
}

/**
 * 不動産価格（取引価格・成約価格）情報を取得（XIT001）。
 * year は今年、quarter は直近の四半期（1〜4）。area / city / station のいずれか必須。
 * @param params year 必須。area / city / station のいずれか必須。
 */
export async function getTransactionPrices(params: {
  year: number;
  quarter?: number;
  area?: string;
  city?: string;
  station?: string;
}): Promise<XIT001Record[]> {
  const { year, quarter, area, city, station } = params;
  const search = new URLSearchParams();
  search.set("year", String(year));
  if (quarter != null && quarter >= 1 && quarter <= 4) {
    search.set("quarter", String(quarter));
  }
  if (area) search.set("area", String(area).padStart(2, "0").slice(0, 2));
  if (city) search.set("city", String(city).slice(0, 5));
  if (station) search.set("station", String(station).slice(0, 6));
  search.set("language", "ja");
  if (!area && !city && !station) {
    throw new Error("XIT001: area, city, station のいずれかが必要です。");
  }
  const pathWithQuery = `XIT001?${search.toString()}`;
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "lib/reinfolib/client.ts:getTransactionPrices", message: "getTransactionPrices entry", data: { year, quarter, area, city, station }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H5" }) }).catch(() => {});
  // #endregion
  try {
    const data = await fetchReinfolib(pathWithQuery, "XIT001");
    const arr = asArray(data);
    const records = arr.filter((row): row is XIT001Record => row != null && typeof row === "object");
    reinfolibLogParsed("XIT001", { recordCount: records.length });
    if (records.length > 0) {
      reinfolibLogXIT001Body(records.length, records as unknown[]);
    }
    return records;
  } catch (e) {
    if (e instanceof Error && e.message === "REINFOLIB_NO_RESULTS") {
      reinfolibLogParsed("XIT001", { recordCount: 0, message: "検索結果がありません" });
      return [];
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${msg} (area=${area ?? "—"}, city=${city ?? "—"}, year=${year}, quarter=${quarter ?? "—"})`);
  }
}

function num(r: XIT001Record, key: keyof XIT001Record): number | undefined {
  const v = (r as Record<string, unknown>)[key as string];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/,/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

/**
 * XIT001 の取得結果を MarketData 形式に要約する。
 * 参照元は国交省（mlit）としてマークし、「いつのどこの情報か」を region_label と本文に含める。
 * @param records XIT001 の取得件
 * @param year 対象年（表示用、任意）
 * @param quarter 対象四半期 1〜4（表示用、任意）
 * @param regionLabel 対象地域（表示用、例: 東京都葛飾区、東京都全区）
 */
export function summarizeToMarketData(
  records: XIT001Record[],
  year?: number,
  quarter?: number,
  regionLabel?: string
): MarketData {
  const result: MarketData = { source: "mlit" };
  if (year != null) result.year = year;
  if (quarter != null) result.quarter = quarter;
  if (regionLabel) result.region_label = regionLabel;
  if (records.length === 0) return result;

  const whenWhere =
    year != null && quarter != null && regionLabel
      ? `${year}年Q${quarter} ${regionLabel}の情報です。`
      : regionLabel
        ? `${regionLabel}の情報です。`
        : "";

  const prices = records
    .map((r) => num(r, "TradePrice"))
    .filter((v): v is number => typeof v === "number" && v > 0);
  const perTsubo = records
    .map((r) => num(r, "PricePerUnit"))
    .filter((v): v is number => typeof v === "number" && v > 0);

  const refParts: string[] = [];

  if (perTsubo.length > 0) {
    const sorted = [...perTsubo].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
    const min = Math.min(...perTsubo);
    const max = Math.max(...perTsubo);
    result.price_per_tsubo = whenWhere
      ? `${whenWhere} 坪単価 中央値約${Math.round(median).toLocaleString()}円/㎡（${sorted.length}件、範囲 ${Math.round(min).toLocaleString()}〜${Math.round(max).toLocaleString()}円/㎡）`
      : `坪単価 中央値約${Math.round(median).toLocaleString()}円/㎡（${sorted.length}件、範囲 ${Math.round(min).toLocaleString()}〜${Math.round(max).toLocaleString()}円/㎡）`;
    refParts.push(
      `坪単価 中央値約${Math.round(median).toLocaleString()}円/㎡（${sorted.length}件）`
    );
  }

  if (prices.length > 0) {
    const minYen = Math.min(...prices);
    const maxYen = Math.max(...prices);
    const salesText = `取引価格 ${prices.length}件（${(minYen / 10000).toLocaleString()}万円〜${(maxYen / 10000).toLocaleString()}万円）。国土交通省「不動産価格情報」より。`;
    result.nearby_sales = whenWhere ? `${whenWhere} ${salesText}` : salesText;
    refParts.push(
      `取引価格 ${(minYen / 10000).toLocaleString()}万円〜${(maxYen / 10000).toLocaleString()}万円（${prices.length}件）`
    );
  }

  const refText =
    refParts.length > 0 ? `参考: ${refParts.join("、")}。` : "";
  const explanation =
    "地価・公示価格の詳細は鑑定評価書情報API（XCT001）で取得可能。本データは取引価格・成約価格情報です。";
  result.land_price = whenWhere
    ? `${whenWhere} ${refText}${explanation}`
    : `${refText}${explanation}`;

  const periodFallback =
    year != null && quarter != null ? `${year}年Q${quarter}` : "";
  const tableRows: PriceTableRow[] = records
    .map((r) => {
      const period =
        typeof (r as Record<string, unknown>).Period === "string"
          ? String((r as Record<string, unknown>).Period).trim()
          : periodFallback;
      const tradePrice = num(r, "TradePrice");
      const pricePerUnit = num(r, "PricePerUnit");
      const hasData = tradePrice != null || pricePerUnit != null;
      if (!hasData) return null;
      const periodLabel = period || periodFallback;
      if (!periodLabel) return null;
      return {
        period: periodLabel,
        trade_price_yen: tradePrice ?? undefined,
        price_per_unit: pricePerUnit ?? undefined,
      } as PriceTableRow;
    })
    .filter((row): row is PriceTableRow => row != null);
  if (tableRows.length > 0) {
    result.price_table = tableRows.slice(0, 50);
  }
  const TRANSACTION_RECORDS_MAX = 500;
  result.transaction_records = (records as Record<string, unknown>[]).slice(0, TRANSACTION_RECORDS_MAX);
  return result;
}

/** 取得できた四半期だけを渡す（空の要素は含めない） */
export interface QuarterData {
  records: XIT001Record[];
  year: number;
  quarter: number;
  regionLabel: string;
}

const PRICE_TABLE_MAX_ROWS = 150;

/**
 * 複数四半期の取得結果を1つの MarketData にまとめる。
 * 表には「取引価格または坪単価の少なくとも一方がある」行のみ載せ、時期は「YYYY年Qn」に統一する。
 */
export function mergeMarketDataFromQuarters(parts: QuarterData[]): MarketData {
  if (parts.length === 0) {
    return { source: "mlit" };
  }
  const allRecords = parts.flatMap((p) => p.records);
  const regionLabel = parts[0]!.regionLabel;
  const sortedParts = [...parts].sort(
    (a, b) => b.year - a.year || b.quarter - a.quarter
  );
  const latest = sortedParts[0]!;
  const result: MarketData = {
    source: "mlit",
    year: latest.year,
    quarter: latest.quarter,
    region_label: regionLabel,
  };

  const tableRows: PriceTableRow[] = [];
  for (const p of parts) {
    const periodLabel = `${p.year}年Q${p.quarter}`;
    for (const r of p.records) {
      const tradePrice = num(r, "TradePrice");
      const pricePerUnit = num(r, "PricePerUnit");
      const hasData = tradePrice != null || pricePerUnit != null;
      if (!hasData) continue;
      tableRows.push({
        period: periodLabel,
        trade_price_yen: tradePrice ?? undefined,
        price_per_unit: pricePerUnit ?? undefined,
      });
    }
  }
  if (tableRows.length > 0) {
    result.price_table = tableRows.slice(0, PRICE_TABLE_MAX_ROWS);
  }

  const TRANSACTION_RECORDS_MAX = 500;
  result.transaction_records = (allRecords as Record<string, unknown>[]).slice(0, TRANSACTION_RECORDS_MAX);

  const prices = allRecords
    .map((r) => num(r, "TradePrice"))
    .filter((v): v is number => typeof v === "number" && v > 0);
  const perTsubo = allRecords
    .map((r) => num(r, "PricePerUnit"))
    .filter((v): v is number => typeof v === "number" && v > 0);

  const sortedByPeriod = [...parts].sort(
    (a, b) => a.year - b.year || a.quarter - b.quarter
  );
  const first = sortedByPeriod[0]!;
  const last = sortedByPeriod[sortedByPeriod.length - 1]!;
  const periodRange =
    parts.length === 1
      ? `${first.year}年Q${first.quarter}`
      : `${first.year}年Q${first.quarter}〜${last.year}年Q${last.quarter}`;
  const whenWhere = `${periodRange} ${regionLabel}の情報です。取得できた四半期のみ。`;

  const refParts: string[] = [];
  if (perTsubo.length > 0) {
    const sorted = [...perTsubo].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
    const min = Math.min(...perTsubo);
    const max = Math.max(...perTsubo);
    result.price_per_tsubo = `${whenWhere} 坪単価 中央値約${Math.round(median).toLocaleString()}円/㎡（${sorted.length}件、範囲 ${Math.round(min).toLocaleString()}〜${Math.round(max).toLocaleString()}円/㎡）`;
    refParts.push(
      `坪単価 中央値約${Math.round(median).toLocaleString()}円/㎡（${sorted.length}件）`
    );
  }
  if (prices.length > 0) {
    const minYen = Math.min(...prices);
    const maxYen = Math.max(...prices);
    result.nearby_sales = `${whenWhere} 取引価格 ${prices.length}件（${(minYen / 10000).toLocaleString()}万円〜${(maxYen / 10000).toLocaleString()}万円）。国土交通省「不動産価格情報」より。`;
    refParts.push(
      `取引価格 ${(minYen / 10000).toLocaleString()}万円〜${(maxYen / 10000).toLocaleString()}万円（${prices.length}件）`
    );
  }

  const refText =
    refParts.length > 0 ? `参考: ${refParts.join("、")}。` : "";
  const explanation =
    "地価・公示価格の詳細は鑑定評価書情報API（XCT001）で取得可能。本データは取引価格・成約価格情報です。";
  result.land_price = `${whenWhere} ${refText}${explanation}`;
  return result;
}

/**
 * API キーが設定されているかどうか。
 */
export function isReinfolibConfigured(): boolean {
  return !!getApiKey();
}
