import type { PropertyInput } from "@/lib/types/property";
import type { GptSettings } from "@/lib/types/gptSettings";
import type { JudgementResult, JudgementRisk } from "@/lib/types/judgement";

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * スタブ判定: PropertyInput と GptSettings から JudgementResult をルールベースで生成する。
 * OpenAI は呼ばない。
 */
export function judgeWithStub(
  input: PropertyInput,
  _settings?: GptSettings | null
): JudgementResult {
  void _settings; // 将来のGPT呼び出し時に参照
  const reasons: string[] = [];
  const missing_checks: string[] = [];
  const risks: JudgementRisk[] = [];
  const recommended_next_actions: string[] = [];

  // D. 即NG判定
  const ngReasons: string[] = [];
  if (input.ng_rebuild_not_allowed) ngReasons.push("再建築不可");
  if (input.ng_road_access_fail) ngReasons.push("接道義務未達");
  if (input.ng_unknown_leak) ngReasons.push("雨漏り（原因不明）");
  if (input.ng_structure_severe) ngReasons.push("重大な構造腐朽/傾き");
  if (input.ng_retaining_wall_unfixable) ngReasons.push("擁壁/崖条例で是正不可");
  if (input.ng_neighbor_trouble) ngReasons.push("近隣トラブル/係争中");
  if (input.loan_impossible_both === "YES") ngReasons.push("住宅ローン・投資ローンともに不可");

  const isNg = ngReasons.length > 0;
  if (isNg) {
    reasons.push(...ngReasons.map((r) => `即NG: ${r}`));
    recommended_next_actions.push("該当条件の解消可否を確認する", "再販前提でない用途を検討する");
    return {
      verdict: "NG",
      confidence: randomInRange(80, 95),
      reasons,
      missing_checks: [],
      risks: [
        {
          title: "再販見送り事由",
          impact: "買取再販の前提を満たさないため、本案件は見送り推奨です。",
        },
      ],
      recommended_next_actions,
    };
  }

  // loan_impossible_both UNKNOWN → missing_checks
  if (input.loan_impossible_both === "UNKNOWN") {
    missing_checks.push("ローン可否の確認");
  }

  // G. 工事・回転リスク
  if (!input.within_90_days) {
    risks.push({
      title: "工期リスク",
      impact: "90日以内の工期が難しい場合、回転が悪化する可能性があります。",
    });
  }
  if (!input.min_spec_ok) {
    risks.push({
      title: "MIN仕様リスク",
      impact: "MIN仕様で成立しない場合、コスト増や採算悪化の可能性があります。",
    });
  }
  if (!input.s_plus_partial_ok && !input.min_spec_ok) {
    risks.push({
      title: "仕様・工期リスク",
      impact: "工期/仕様の両面で制約があり、回転計画の再検討が必要です。",
    });
  }

  // missing_checks が1件以上 → HOLD（NGでない場合）
  if (missing_checks.length > 0) {
    reasons.push("未確認項目があるため保留としました。");
    recommended_next_actions.push("missing_checks の項目を確認・解消後に再判定する");
    return {
      verdict: "HOLD",
      confidence: randomInRange(50, 70),
      reasons,
      missing_checks,
      risks,
      recommended_next_actions,
    };
  }

  // OK
  reasons.push("即NG条件に該当せず、未確認項目もありません。");
  if (risks.length > 0) {
    reasons.push("工事・回転面でリスクがあるため、実施前に計画の精査を推奨します。");
    recommended_next_actions.push("工期・仕様の実現可能性を再確認する");
  } else {
    recommended_next_actions.push("現状の前提で次のステップ（現地確認・査定）に進む");
  }

  return {
    verdict: "OK",
    confidence: randomInRange(60, 85),
    reasons,
    missing_checks: [],
    risks,
    recommended_next_actions,
  };
}
