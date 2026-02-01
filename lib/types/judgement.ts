/**
 * 判定結果（AI/スタブが返す構造化出力）と問い合わせレコード
 */

import type { PropertyInput } from "./property";

export type Verdict = "GO" | "NO_GO" | "HOLD";

export interface JudgementRisk {
  title: string;
  impact: string;
}

export interface JudgementResult {
  verdict: Verdict;
  confidence: number;
  reasons: string[];
  missing_checks: string[];
  risks: JudgementRisk[];
  /** 高評価ポイント（良い点の箇条書き）。既存データ用に optional */
  high_points?: string[];
  /** 低評価ポイント（要改善・注意すべき点の箇条書き）。既存データ用に optional */
  low_points?: string[];
  recommended_next_actions: string[];
}

/** 入力住所に基づくエリアの特徴・ポテンシャル（GPTで周辺状況を踏まえて生成） */
export interface AreaProfile {
  /** エリア概要・周辺状況・特徴・ポテンシャル（Markdown可） */
  content: string;
  /** Web検索（Serper）を併用した場合 true */
  used_web_search?: boolean;
}

/** 希望売却価格の妥当性フィードバック（GPTで周辺相場等を踏まえて生成） */
export interface PriceFeedback {
  /** 妥当性の結論（例: 妥当 / やや高め / 要検討） */
  verdict: string;
  /** 理由・根拠（Markdown可） */
  reasoning: string;
}

/** 地価・坪単価・周辺実売など（GPT+Web または 国交省API で取得、同一構造で格納） */
export interface MarketData {
  land_price?: string;
  price_per_tsubo?: string;
  nearby_sales?: string;
}

export interface PromptSnapshot {
  name: string;
  version: string;
  content: string;
  model: string;
  temperature: number;
}

export type JudgementRecordStatus = "COMPLETED" | "FAILED";

/** 判定の実際の結果（アウトカム） */
export type OutcomeStatus = "pending" | "visited" | "passed" | "acquired";

export interface JudgementOutcome {
  outcome_status?: OutcomeStatus | null;
  outcome_score?: number | null;
  outcome_note?: string | null;
  outcome_at?: string | null;
}

export interface JudgementRecord {
  id: string;
  created_at: string;
  input: PropertyInput;
  output: JudgementResult;
  prompt_snapshot: PromptSnapshot;
  status: JudgementRecordStatus;
  error_message?: string;
  /** 住所に基づくエリアの特徴・ポテンシャル（GPT生成） */
  area_profile?: AreaProfile | null;
  /** 希望価格の妥当性フィードバック（GPT生成） */
  price_feedback?: PriceFeedback | null;
  /** 周辺家賃相場・参考賃料（GPT+Web取得） */
  surrounding_rent_market?: string | null;
  /** 地価・坪単価・周辺実売など（GPT+Web または 国交省API） */
  market_data?: MarketData | null;
  /** 実際の結果（未記録/訪問/見送り/買取） */
  outcome_status?: OutcomeStatus | null;
  /** 事後のスコア（1-5など、任意） */
  outcome_score?: number | null;
  /** 結果の自由メモ */
  outcome_note?: string | null;
  /** 結果を記録した日時（ISO文字列） */
  outcome_at?: string | null;
}
