/**
 * 国交省・不動産情報ライブラリ API のリクエスト／レスポンスログ。
 * リクエストパラメータと返却内容を一箇所で記録し、デバッグしやすくする。
 *
 * ログの出どころ:
 * 1. コンソール（常に出る） … npm run dev のターミナルに [REINFOLIB] で表示。
 * 2. ファイル … プロジェクト直下の log.txt に追記（REINFOLIB_LOG_PATH で変更可）。
 *    各イベントは「読みやすい1行」＋「JSON1行」で記録。
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const PREFIX = "[REINFOLIB]";

/** 書き込み時に毎回パスを解決する（サーバーアクション実行時の cwd を使う） */
function getLogPath(): string {
  const envPath = process.env.REINFOLIB_LOG_PATH?.trim();
  return envPath || resolve(process.cwd(), "log.txt");
}

// #region agent log
function dbg(msg: string, data: Record<string, unknown>, hypothesisId: string): void {
  const payload = { location: "lib/reinfolib/log.ts", message: msg, data, timestamp: Date.now(), sessionId: "debug-session", hypothesisId };
  fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
}
dbg("log module loaded", { getLogPath: getLogPath(), cwd: process.cwd() }, "H1");
// #endregion

export type ReinfolibLogType = "request" | "response" | "response_parsed" | "resolve" | "error";

export interface ReinfolibLogEntry {
  ts: string;
  type: ReinfolibLogType;
  api: string;
  [key: string]: unknown;
}

function formatLine(entry: ReinfolibLogEntry): string {
  return JSON.stringify(entry) + "\n";
}

/** 人が読める1行サマリ（log.txt 用） */
function formatSummary(entry: ReinfolibLogEntry): string {
  const { type, api, ts } = entry;
  const t = new Date(ts).toLocaleString("ja");
  if (type === "request") {
    const url = String(entry.url ?? "");
    const params = entry.params as Record<string, string> | undefined;
    const p = params ? Object.entries(params).map(([k, v]) => `${k}=${v}`).join(" ") : "";
    return `[${t}] >> リクエスト ${api}: ${url} ${p}\n`;
  }
  if (type === "response") {
    const status = entry.status;
    const ok = entry.ok;
    if (ok) {
      return `[${t}] << レスポンス ${api}: status=${status} bodyLength=${entry.bodyLength ?? "—"}\n`;
    }
    const msg = entry.errorMessage ?? entry.errorBodySnippet ?? "";
    return `[${t}] << レスポンス ${api}: status=${status} ${msg}\n`;
  }
  if (type === "response_parsed") {
    const n = entry.recordCount ?? entry.cityCount;
    const msg = entry.message ?? "";
    if (api === "XIT001") {
      return `[${t}] << 結果 XIT001: 取得件数=${n ?? "—"}${msg ? ` （${msg}）` : ""}\n`;
    }
    if (api === "XIT002") {
      return `[${t}] << 結果 XIT002: 市区町村数=${n ?? "—"}\n`;
    }
    return `[${t}] << 結果 ${api}: ${JSON.stringify(entry)}\n`;
  }
  if (type === "resolve") {
    const area = entry.areaCode;
    const city = entry.cityCode ?? "—";
    const addr = entry.address ?? "";
    return `[${t}] >> 住所解決: ${addr} → area=${area} city=${city}\n`;
  }
  return `[${t}] ${api} ${type}: ${JSON.stringify(entry)}\n`;
}

function writeToFile(entry: ReinfolibLogEntry, jsonLine: string): void {
  const path = getLogPath();
  // #region agent log
  dbg("writeToFile called", { path, cwd: process.cwd(), type: entry.type, api: entry.api }, "H4");
  // #endregion
  if (!path) return;
  try {
    const dir = dirname(path);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    const summary = formatSummary(entry);
    appendFileSync(path, summary + jsonLine, "utf8");
    // #region agent log
    dbg("writeToFile success", { path, bytes: (summary + jsonLine).length }, "H4");
    // #endregion
  } catch (err) {
    // #region agent log
    dbg("writeToFile failed", { path, error: String(err) }, "H4");
    // #endregion
    console.warn(`${PREFIX} ログファイルへの書き込みに失敗しました: ${path}`, err);
  }
}

/**
 * 国交省APIの1件のログを記録する。
 * type: request = リクエスト送信時、response = HTTPレスポンス受信時、response_parsed = パース後の件数など
 */
export function reinfolibLog(entry: Omit<ReinfolibLogEntry, "ts">): void {
  // #region agent log
  dbg("reinfolibLog entry", { type: entry.type, api: entry.api }, "H5");
  // #endregion
  const full: ReinfolibLogEntry = {
    ...entry,
    ts: new Date().toISOString(),
  } as ReinfolibLogEntry;
  const line = formatLine(full);
  console.info(PREFIX, line.trim());
  writeToFile(full, line);
}

/**
 * リクエスト送信時のログ（URL・パラメータ）
 */
export function reinfolibLogRequest(
  api: string,
  url: string,
  params: Record<string, unknown>
): void {
  reinfolibLog({
    type: "request",
    api,
    url,
    params,
  });
}

/**
 * HTTPレスポンス受信時のログ（ステータス・本文長・エラー時は本文の先頭）
 */
export function reinfolibLogResponse(
  api: string,
  detail: {
    status: number;
    ok: boolean;
    bodyLength?: number;
    errorBodySnippet?: string;
    errorMessage?: string;
  }
): void {
  reinfolibLog({
    type: "response",
    api,
    ...detail,
  });
}

/**
 * レスポンスをパースした後のログ（取得件数など）
 */
export function reinfolibLogParsed(
  api: string,
  detail: { recordCount?: number; cityCount?: number; message?: string }
): void {
  reinfolibLog({
    type: "response_parsed",
    api,
    ...detail,
  });
}

/** XIT001 のレスポンス実体をログに残す（件数＋先頭数件の生データ）。どのキーが地価・日付か判断する用。 */
const XIT001_BODY_LOG_SAMPLE_SIZE = 3;

export function reinfolibLogXIT001Body(recordCount: number, records: unknown[]): void {
  const path = getLogPath();
  if (!path) return;
  try {
    const dir = dirname(path);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString();
    const header = `[${ts}] === XIT001 レスポンス実体（取得件数=${recordCount}、先頭${Math.min(XIT001_BODY_LOG_SAMPLE_SIZE, records.length)}件をそのまま記載） ===\n`;
    const sample = records.slice(0, XIT001_BODY_LOG_SAMPLE_SIZE);
    const body = JSON.stringify(sample, null, 2) + "\n";
    appendFileSync(path, header + body, "utf8");
    console.info(PREFIX, `XIT001 レスポンス実体をログに追記（件数=${recordCount}、サンプル=${sample.length}件）`);
  } catch (err) {
    console.warn(`${PREFIX} XIT001 レスポンスログの書き込みに失敗しました`, err);
  }
}

/**
 * 国交省APIを試す前に必ず1行だけ log.txt に書く（fetchMarketData 入口用）。
 * これで「ファイルが書けるか」「APIキー有無」「住所」を確認できる。
 */
export function reinfolibLogBootstrap(message: string, data: Record<string, unknown>): void {
  const path = getLogPath();
  const line = `[${new Date().toISOString()}] ${message} ${JSON.stringify(data)}\n`;
  if (!path) return;
  console.log(`${PREFIX} log.txt に書き込みます: ${path}`);
  try {
    const dir = dirname(path);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(path, line, "utf8");
    console.log(`${PREFIX} 書き込み完了: ${path}`);
  } catch (err) {
    console.warn(`${PREFIX} ログ書き込み失敗: ${path}`, err);
  }
}

/** log.txt の絶対パス（デバッグ用） */
export function getReinfolibLogPath(): string {
  return getLogPath();
}

/**
 * 住所→都道府県・市区町村コード解決結果のログ（XIT001 のパラメータ特定に使用）
 */
export function reinfolibLogResolve(detail: {
  address: string;
  postalCode?: string | null;
  areaCode: string;
  cityCode: string | null;
  prefecture?: string;
  cityNameFromInput?: string;
}): void {
  reinfolibLog({
    type: "resolve",
    api: "resolve",
    ...detail,
  });
}
