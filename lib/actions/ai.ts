"use server";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { AreaProfile, PriceFeedback, MarketData } from "@/lib/types/judgement";
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
  reinfolib: { ok: boolean; configured: boolean; message: string };
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

  let reinfolib: ApiCheckResult["reinfolib"];
  const reinfolibKey = process.env.REINFOLIB_MLIT_API_KEY?.trim();
  if (!reinfolibKey) {
    reinfolib = { ok: false, configured: false, message: "REINFOLIB_MLIT_API_KEY は未設定です（任意）。設定すると地価・取引価格で国交省APIを利用します。" };
  } else {
    try {
      const { fetchReinfolib } = await import("@/lib/reinfolib/client");
      await fetchReinfolib("XIT002?area=13");
      reinfolib = { ok: true, configured: true, message: "接続成功（不動産情報ライブラリAPIが利用できます）" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      reinfolib = { ok: false, configured: true, message: `接続失敗: ${msg}` };
    }
  }

  return { openai, serper, supabase, reinfolib };
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
 * marketData を渡した場合、その内容をプロンプトに含め根拠にし、参照元（国交省/Web）をマークする。
 */
export async function fetchPriceFeedback(
  address: string,
  desiredPriceYen: number | undefined,
  marketData?: MarketData | null
): Promise<PriceFeedback | null> {
  if (!address?.trim()) return null;
  const openai = getOpenAIClient();
  if (!openai) {
    console.error("[AI] OPENAI_API_KEY が設定されていません。");
    return null;
  }

  const source: "mlit" | "web" =
    marketData?.source === "mlit" ? "mlit" : "web";

  try {
    const priceNote =
      desiredPriceYen != null && desiredPriceYen > 0
        ? `希望売却価格: ${(desiredPriceYen / 10000).toLocaleString()}万円`
        : "希望売却価格は未入力";

    let marketContext = "";
    if (marketData && (marketData.land_price ?? marketData.price_per_tsubo ?? marketData.nearby_sales)) {
      const parts: string[] = [];
      if (marketData.land_price) parts.push(`地価: ${marketData.land_price}`);
      if (marketData.price_per_tsubo) parts.push(`坪単価: ${marketData.price_per_tsubo}`);
      if (marketData.nearby_sales) parts.push(`周辺実売: ${marketData.nearby_sales}`);
      marketContext =
        "\n\n【参考：周辺相場データ】\n" +
        parts.join("\n") +
        "\n上記の相場データを根拠の優先材料として、希望価格の妥当性を判定してください。";
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_LATEST_MODEL,
      messages: [
        {
          role: "system",
          content: `あなたは不動産買取・査定の専門家です。
住所と希望売却価格を踏まえ、その価格が妥当かどうかを簡潔に判定してください。
判定は「妥当」「やや高め」「やや安め」「要検討」のいずれかで結論し、理由を2〜3行で述べてください。
参考として周辺相場データ（地価・坪単価・周辺実売）が渡された場合は、それを根拠の優先材料として活用してください。`,
        },
        {
          role: "user",
          content: `住所: ${address}\n${priceNote}${marketContext}\n\n上記について、希望価格の妥当性を判定し、結論と理由を述べてください。`,
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

    return { verdict, reasoning, source };
  } catch (err) {
    console.error("[AI] 希望価格の妥当性の取得に失敗しました:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 周辺家賃相場・参考賃料を取得（GPT + Web検索）。
 * 結果画面・管理画面で「周辺家賃相場（参考）」として表示する。
 */
export async function fetchSurroundingRentMarket(
  address: string
): Promise<string | null> {
  if (!address?.trim()) return null;
  const openai = getOpenAIClient();
  if (!openai) {
    console.error("[AI] OPENAI_API_KEY が設定されていません。");
    return null;
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();
  let webContext = "";

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: `${address} 周辺 家賃相場 賃料 相場 賃貸`,
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
        }
      }
    } catch (serperErr) {
      console.warn("[AI] 周辺家賃のWeb検索に失敗しました。GPT のみで続行:", serperErr instanceof Error ? serperErr.message : serperErr);
    }
  }

  try {
    const prompt = `あなたは不動産・賃貸相場の専門家です。
以下の住所について、周辺の家賃相場・参考賃料を簡潔にまとめてください。
${webContext ? "上記のWeb検索結果を踏まえつつ、" : ""}一般的な相場感も補足してください。

住所: ${address}

出力は日本語で、200字程度でまとめてください。数値（例: 〇〇円〜〇〇円/月）があれば含めてください。`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_LATEST_MODEL,
      messages: [
        {
          role: "system",
          content: "あなたは不動産賃貸相場の専門家です。住所に基づき、周辺の家賃相場・参考賃料を簡潔にまとめてください。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? null;
    return content;
  } catch (err) {
    console.error("[AI] 周辺家賃相場の取得に失敗しました:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 住所に基づき最寄駅・徒歩分数を取得（GPT + オプションでWeb検索）。
 * 戻り値例: "〇〇駅 徒歩5分"
 */
export async function fetchNearestStation(address: string): Promise<string | null> {
  if (!address?.trim()) return null;
  const openai = getOpenAIClient();
  if (!openai) {
    console.error("[AI] OPENAI_API_KEY が設定されていません。");
    return null;
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();
  let webContext = "";

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: `${address} 最寄駅 徒歩`,
          num: 5,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          organic?: { title?: string; snippet?: string }[];
        };
        const snippets = (data.organic ?? [])
          .slice(0, 4)
          .map((o) => `${o.title ?? ""}\n${o.snippet ?? ""}`)
          .filter(Boolean);
        if (snippets.length > 0) {
          webContext =
            "\n\n【参考：Web検索結果】\n" +
            snippets.join("\n\n---\n\n");
        }
      }
    } catch (serperErr) {
      console.warn("[AI] 最寄駅のWeb検索に失敗しました。GPT のみで続行:", serperErr instanceof Error ? serperErr.message : serperErr);
    }
  }

  try {
    const prompt = `以下の住所について、最寄駅と徒歩分数を1行で答えてください。
${webContext ? "上記のWeb検索結果を参考にしつつ、" : ""}「〇〇駅 徒歩△分」の形式でお願いします。複数ある場合は最も近い駅を1つだけ。

住所: ${address}`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_LATEST_MODEL,
      messages: [
        {
          role: "system",
          content: "あなたは不動産・立地の専門家です。住所に基づき、最寄駅と徒歩分数を「〇〇駅 徒歩△分」の形式で簡潔に答えてください。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 100,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? null;
    return content || null;
  } catch (err) {
    console.error("[AI] 最寄駅の取得に失敗しました:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 地価・坪単価・周辺戸建て売買相場を取得。
 * REINFOLIB_MLIT_API_KEY が設定されていれば国交省API（XIT001）を優先し、
 * 未設定・エラー・該当データなしの場合は GPT + Web検索にフォールバックする。
 * year は今年、quarter は直近の四半期（1〜4）。データが無い場合は前四半期・前年Q4にフォールバックする。
 */
export async function fetchMarketData(
  address: string,
  postalCode?: string | null
): Promise<MarketData | null> {
  const reinfolibKey = process.env.REINFOLIB_MLIT_API_KEY?.trim();
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "lib/actions/ai.ts:fetchMarketData", message: "fetchMarketData entry", data: { address: address?.slice(0, 50), hasReinfolibKey: !!reinfolibKey }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H2" }) }).catch(() => {});
  // #endregion
  try {
    console.log("[REINFOLIB] fetchMarketData 呼び出し address=", address?.slice(0, 50), "hasKey=", !!reinfolibKey);
    const { reinfolibLogBootstrap, getReinfolibLogPath } = await import("@/lib/reinfolib/log");
    reinfolibLogBootstrap("fetchMarketData", {
      address: address?.slice(0, 80) ?? "",
      hasReinfolibKey: !!reinfolibKey,
      logPath: getReinfolibLogPath(),
    });
  } catch (e) {
    console.warn("[REINFOLIB] bootstrap log failed", e);
  }
  if (!address?.trim()) return null;

  if (reinfolibKey) {
    try {
      const { resolveAreaAndCity } = await import("@/lib/reinfolib/resolve");
      const { getTransactionPrices, mergeMarketDataFromQuarters } = await import("@/lib/reinfolib/client");
      const resolved = await resolveAreaAndCity(address, postalCode ?? undefined);
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "lib/actions/ai.ts:after resolve", message: "resolveAreaAndCity result", data: { resolved: !!resolved, areaCode: resolved?.areaCode, cityCode: resolved?.cityCode ?? null }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H3" }) }).catch(() => {});
      // #endregion
      if (resolved) {
        const now = new Date();
        const year = now.getFullYear();
        const { getCities } = await import("@/lib/reinfolib/client");
        const { prefectureCodeToName } = await import("@/lib/reinfolib/prefecture");
        const cities = await getCities(resolved.areaCode);
        const prefectureName = prefectureCodeToName(resolved.areaCode) ?? "";
        const regionLabelPrimary =
          resolved.cityCode ? `${prefectureName}${cities.find((c) => c.id === resolved.cityCode)?.name ?? ""}` : `${prefectureName}全区`;

        /** 過去に確実に公開済みの四半期のみ。直近1年〜3年前（当年・当四半期は含めない） */
        const buildAttempts = (): { year: number; quarter: number }[] => {
          const out: { year: number; quarter: number }[] = [];
          for (let y = year - 1; y >= year - 3; y--) {
            for (let q = 4; q >= 1; q--) {
              out.push({ year: y, quarter: q });
            }
          }
          return out;
        };

        const attempts = buildAttempts();

        const collectQuarters = async (
          cityCode: string | undefined,
          regionLabel: string
        ): Promise<{ records: Awaited<ReturnType<typeof getTransactionPrices>>; year: number; quarter: number; regionLabel: string }[]> => {
          const collected: { records: Awaited<ReturnType<typeof getTransactionPrices>>; year: number; quarter: number; regionLabel: string }[] = [];
          for (const { year: y, quarter: q } of attempts) {
            const records = await getTransactionPrices({
              year: y,
              quarter: q,
              area: resolved.areaCode,
              city: cityCode,
            });
            if (records.length > 0) {
              collected.push({ records, year: y, quarter: q, regionLabel });
            }
          }
          return collected;
        };

        const cityParts = await collectQuarters(resolved.cityCode ?? undefined, regionLabelPrimary);
        if (cityParts.length > 0) {
          return mergeMarketDataFromQuarters(cityParts);
        }

        const areaParts = await collectQuarters(undefined, `${prefectureName}全区`);
        if (areaParts.length > 0) {
          return mergeMarketDataFromQuarters(areaParts);
        }

        const otherCities = cities.filter((c) => c.id !== (resolved.cityCode ?? ""));
        for (const other of otherCities.slice(0, 3)) {
          const otherParts = await collectQuarters(other.id, `${prefectureName}${other.name}`);
          if (otherParts.length > 0) {
            return mergeMarketDataFromQuarters(otherParts);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[AI] 国交省API リクエストエラー（パラメータや認証の確認を推奨）:", msg);
    }
  }

  const openai = getOpenAIClient();
  if (!openai) {
    console.error("[AI] OPENAI_API_KEY が設定されていません。");
    return null;
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();
  let webContext = "";

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: `${address} 地価 公示価格 坪単価 戸建て 売買 成約 相場`,
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
        }
      }
    } catch (serperErr) {
      console.warn("[AI] 地価・坪単価のWeb検索に失敗しました。GPT のみで続行:", serperErr instanceof Error ? serperErr.message : serperErr);
    }
  }

  try {
    const prompt = `あなたは不動産・土地・戸建て売買の専門家です。
以下の住所について、地価（公示価格等）、坪単価、周辺の戸建て売買相場・成約例を簡潔にまとめてください。
${webContext ? "上記のWeb検索結果を踏まえつつ、" : ""}一般的な相場感も補足してください。

住所: ${address}

以下の3項目について、それぞれ1〜2文で簡潔に回答してください。不明な項目は「不明」と書いてください。
- land_price: 地価（公示価格・基準地価等）
- price_per_tsubo: 坪単価の目安
- nearby_sales: 周辺の戸建て売買・成約相場`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_LATEST_MODEL,
      messages: [
        {
          role: "system",
          content: "あなたは不動産・土地・戸建て売買の専門家です。住所に基づき、地価・坪単価・周辺実売を簡潔にまとめ、land_price / price_per_tsubo / nearby_sales の形式で回答してください。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? null;
    if (!content) return null;

    const landPriceMatch = content.match(/land_price[：:]\s*([^\n]+)/i) ?? content.match(/地価[：:]\s*([^\n]+)/);
    const pricePerTsuboMatch = content.match(/price_per_tsubo[：:]\s*([^\n]+)/i) ?? content.match(/坪単価[：:]\s*([^\n]+)/);
    const nearbySalesMatch = content.match(/nearby_sales[：:]\s*([^\n]+)/i) ?? content.match(/周辺[^\n]*売買[：:]\s*([^\n]+)/);

    const result: MarketData = { source: "web" };
    if (landPriceMatch?.[1]) result.land_price = landPriceMatch[1].trim();
    if (pricePerTsuboMatch?.[1]) result.price_per_tsubo = pricePerTsuboMatch[1].trim();
    if (nearbySalesMatch?.[1]) result.nearby_sales = nearbySalesMatch[1].trim();

    if (Object.keys(result).length === 1) {
      result.land_price = content.slice(0, 200);
    }
    return result;
  } catch (err) {
    console.error("[AI] 地価・坪単価・実売の取得に失敗しました:", err instanceof Error ? err.message : err);
    return null;
  }
}
