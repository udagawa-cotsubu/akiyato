/**
 * 判定結果（AI/スタブが返す構造化出力）と問い合わせレコード
 */

import type { PropertyInput } from "./property";

export type Verdict = "OK" | "NG" | "HOLD";

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
  recommended_next_actions: string[];
}

export interface PromptSnapshot {
  name: string;
  version: string;
  content: string;
  model: string;
  temperature: number;
}

export type JudgementRecordStatus = "COMPLETED" | "FAILED";

export interface JudgementRecord {
  id: string;
  created_at: string;
  input: PropertyInput;
  output: JudgementResult;
  prompt_snapshot: PromptSnapshot;
  status: JudgementRecordStatus;
  error_message?: string;
}
