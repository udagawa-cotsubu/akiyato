"use server";

import OpenAI from "openai";
import { formatPropertyInputForPrompt } from "@/lib/judge/formatPropertyInput";
import { get as getGptSettings } from "@/lib/repositories/gptSettingsRepository";
import { OPENAI_LATEST_MODEL } from "@/lib/types/gptSettings";
import type { JudgementResult, JudgementRisk } from "@/lib/types/judgement";
import type { PropertyInput } from "@/lib/types/property";
import type { GptSettings } from "@/lib/types/gptSettings";

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/**
 * 物件情報を GPT で判定する（本番用。スタブは使わない）。
 * OPENAI_API_KEY が未設定の場合はエラーを投げる。
 */
export async function runJudge(
  input: PropertyInput,
  settings?: GptSettings | null
): Promise<JudgementResult> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error(
      "OPENAI_API_KEY が設定されていません。.env.local を確認し、開発サーバーを再起動してください。"
    );
  }

  const gpt = settings ?? (await getGptSettings());
  const userContent = `以下の物件情報です。\n\n${formatPropertyInputForPrompt(input)}`;

  const completion = await openai.chat.completions.create({
    model: OPENAI_LATEST_MODEL,
    messages: [
      { role: "system", content: gpt.prompt_content },
      { role: "user", content: userContent },
    ],
    temperature: gpt.temperature,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("判定結果が空でした。");
  }

  // マークダウンコードブロックを除去
  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`判定結果のJSON解析に失敗しました: ${raw.slice(0, 200)}…`);
  }

  const obj = parsed as Record<string, unknown>;
  const rawVerdict = obj.verdict;
  let verdict: JudgementResult["verdict"] = "HOLD";
  if (rawVerdict === "GO" || rawVerdict === "NO_GO" || rawVerdict === "HOLD") {
    verdict = rawVerdict;
  } else if (rawVerdict === "OK") {
    verdict = "GO";
  } else if (rawVerdict === "NG") {
    verdict = "NO_GO";
  }
  const confidence = typeof obj.confidence === "number" ? Math.max(0, Math.min(100, obj.confidence)) : 50;
  const reasons = Array.isArray(obj.reasons) ? (obj.reasons as string[]) : [];
  const missing_checks = Array.isArray(obj.missing_checks) ? (obj.missing_checks as string[]) : [];
  const risksRaw = Array.isArray(obj.risks) ? obj.risks : [];
  const risks: JudgementRisk[] = risksRaw
    .filter((r): r is Record<string, string> => typeof r === "object" && r !== null && typeof r.title === "string" && typeof r.impact === "string")
    .map((r) => ({ title: r.title, impact: r.impact }));
  const recommended_next_actions = Array.isArray(obj.recommended_next_actions)
    ? (obj.recommended_next_actions as string[])
    : [];
  const low_points = Array.isArray(obj.low_points) ? (obj.low_points as string[]) : [];

  return {
    verdict,
    confidence,
    reasons,
    low_points,
    missing_checks,
    risks,
    recommended_next_actions,
  };
}
