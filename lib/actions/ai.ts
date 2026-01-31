"use server";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { AreaProfile, PriceFeedback } from "@/lib/types/judgement";
import { OPENAI_LATEST_MODEL } from "@/lib/types/gptSettings";

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/** API接続チェック結果（管理画面の「API接続チェック」で使用） */
export type ApiCheckResult = {
  openai: { ok: boolean; message: string };
  serper: { ok: boolean; configured: boolean; message: string };
  supabase: { ok: boolean; message: string };
};

/** OpenAI / Serper / Supabase の接続・利用可否をチェックする */
export async function checkApis(): Promise<ApiCheckResult> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const serperKey = process.env.SERPER_API_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let openai: ApiCheckResult["openai"];
  if (!openaiKey) {
    openai = { ok: false, message: "OPENAI_API_KEY が設定されていません。.env.local に追加し、開発サーバーを再起動してください。" };
  } else {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      await client.chat.completions.create({
        model: OPENAI_LATEST_MODEL,
        messages: [{ role: "user", content: "Say OK in one word." }],
        max_tokens: 10,
      });
      openai = { ok: true, message: "接続成功（OpenAI API が利用できます）" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      openai = { ok: false, message: `接続失敗: ${msg}` };
    }
  }

  let serper: ApiCheckResult["serper"];
  if (!serperKey) {
    serper = { ok: false, configured: false, message: "SERPER_API_KEY は未設定です（任意）。設定すると住所の特徴で Web 検索を併用します。" };
  } else {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: "test", num: 1 }),
      });
      if (res.ok) {
        serper = { ok: true, configured: true, message: "接続成功（Serper API が利用できます）" };
      } else {
        const text = await res.text();
        serper = { ok: false, configured: true, message: `接続失敗: HTTP ${res.status} ${text.slice(0, 100)}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      serper = { ok: false, configured: true, message: `接続失敗: ${msg}` };
    }
  }

  let supabase: ApiCheckResult["supabase"];
  if (!supabaseUrl || !supabaseAnonKey) {
    supabase = { ok: false, message: "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。.env.local に追加し、開発サーバーを再起動してください。" };
  } else {
    try {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await client.from("judgements").select("id").limit(1);
      if (error) {
        supabase = { ok: false, message: `接続失敗: ${error.message}（テーブル judgements が存在するか、supabase/migrations/001_create_judgements.sql を SQL Editor で実行してください）` };
      } else {
        supabase = { ok: true, message: "接続成功（判定結果の保存が利用できます）" };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      supabase = { ok: false, message: `接続失敗: ${msg}` };
    }
  }

  return { openai, serper, supabase };
}

/**
 * 住所に基づくエリアの特徴を取得（GPT + オプションでWeb検索）。
 * Web検索は SERPER_API_KEY が設定されている場合のみ実行し、結果をGPTで要約する。
 */
export async function fetchAreaProfile(
  address: string
): Promise<AreaProfile | null> {
  if (!address?.trim()) return null;
  const openai = getOpenAIClient();
  if (!openai) {
    console.error("[AI] OPENAI_API_KEY が設定されていません。.env.local を確認し、開発サーバーを再起動してください。");
    return null;
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();

  try {
    let webContext = "";
    let used_web_search = false;
    if (serperKey) {
      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: `${address} 周辺 地域 特徴 駅 環境`,
            num: 8,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            organic?: { title?: string; snippet?: string }[];
          };
          const snippets = (data.organic ?? [])
            .slice(0, 6)
            .map((o) => `${o.title ?? ""}\n${o.snippet ?? ""}`)
            .filter(Boolean);
          if (snippets.length > 0) {
            webContext =
              "\n\n【参考：Web検索結果】\n" +
              snippets.join("\n\n---\n\n");
            used_web_search = true;
          }
        } else {
          const text = await res.text();
          console.warn("[AI] Serper API がエラーを返しました:", res.status, text.slice(0, 200));
        }
      } catch (serperErr) {
        console.warn("[AI] Web検索（Serper）に失敗しました。GPT のみで続行します:", serperErr instanceof Error ? serperErr.message : serperErr);
      }
    }

    const prompt = `あなたは不動産・地域分析の専門家です。
以下の住所について、エリアの特徴を簡潔にまとめてください。
${webContext ? "上記のWeb検索結果を踏まえつつ、" : ""}一般的な知見（地理・交通・周辺環境）も補足してください。

住所: ${address}

出力は日本語で、見出しや箇条書きを使って読みやすくしてください。300字程度でまとめてください。`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_LATEST_MODEL,
      messages: [
        {
          role: "system",
          content:
            "あなたは不動産エリア分析の専門家です。住所に基づき、周辺環境・交通・地域の特徴を簡潔にまとめてください。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const content =
      completion.choices[0]?.message?.content?.trim() ?? null;
    if (!content) return null;

    return { content, used_web_search };
  } catch (err) {
    console.error("[AI] 住所の特徴の取得に失敗しました:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 希望売却価格の妥当性フィードバックを取得（GPT）。
 */
export async function fetchPriceFeedback(
  address: string,
  desiredPriceYen: number | undefined
): Promise<PriceFeedback | null> {
  if (!address?.trim()) return null;
  const openai = getOpenAIClient();
  if (!openai) {
    console.error("[AI] OPENAI_API_KEY が設定されていません。");
    return null;
  }

  try {
    const priceNote =
      desiredPriceYen != null && desiredPriceYen > 0
        ? `希望売却価格: ${(desiredPriceYen / 10000).toLocaleString()}万円`
        : "希望売却価格は未入力";

    const completion = await openai.chat.completions.create({
      model: OPENAI_LATEST_MODEL,
      messages: [
        {
          role: "system",
          content: `あなたは不動産買取・査定の専門家です。
住所と希望売却価格を踏まえ、その価格が妥当かどうかを簡潔に判定してください。
判定は「妥当」「やや高め」「やや安め」「要検討」のいずれかで結論し、理由を2〜3行で述べてください。
根拠は一般的な相場感・地域性に基づくもので構いません。`,
        },
        {
          role: "user",
          content: `住所: ${address}\n${priceNote}\n\n上記について、希望価格の妥当性を判定し、結論と理由を述べてください。`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const content =
      completion.choices[0]?.message?.content?.trim() ?? null;
    if (!content) return null;

    const verdictMatch = content.match(
      /^(妥当|やや高め|やや安め|要検討)/
    );
    const verdict = verdictMatch ? verdictMatch[1] : "要検討";
    const reasoning = content.replace(/^(妥当|やや高め|やや安め|要検討)[。\s]*/, "").trim() || content;

    return { verdict, reasoning };
  } catch (err) {
    console.error("[AI] 希望価格の妥当性の取得に失敗しました:", err instanceof Error ? err.message : err);
    return null;
  }
}
