"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  PropertyInput,
  TiltType,
  BuildingLegalStatus,
  RiskLevel,
  StructureType,
  WaterType,
  SewageType,
  GasType,
} from "@/lib/types/property";
import type { JudgementRecord } from "@/lib/types/judgement";
import { fetchAreaProfile, fetchPriceFeedback } from "@/lib/actions/ai";
import { getById, create as createJudgement, deleteRecord } from "@/lib/repositories/judgementsRepository";
import { get as getGptSettings } from "@/lib/repositories/gptSettingsRepository";
import { runJudge } from "@/lib/actions/judge";
import { OPENAI_LATEST_MODEL } from "@/lib/types/gptSettings";
import type { PromptSnapshot } from "@/lib/types/judgement";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TILT_LABELS: Record<TiltType, string> = {
  NONE: "なし",
  SLIGHT: "軽微",
  YES: "あり",
  NEED_CHECK: "要調査",
};

function tiltLabel(tilt: TiltType | undefined): string {
  return tilt ? TILT_LABELS[tilt] ?? "—" : "—";
}

const BUILDING_LEGAL_LABELS: Record<BuildingLegalStatus, string> = {
  CONFIRMED: "建築確認・検査済が確認できた",
  LIKELY_OK: "たぶん問題なさそう（未確認）",
  UNCONFIRMED: "不明",
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  UNKNOWN: "不明",
};

function buildingLegalLabel(v: BuildingLegalStatus | undefined): string {
  return v ? BUILDING_LEGAL_LABELS[v] ?? "—" : "—";
}

function riskLevelLabel(v: RiskLevel | undefined): string {
  return v ? RISK_LEVEL_LABELS[v] ?? "—" : "—";
}

const STRUCTURE_LABELS: Record<StructureType, string> = {
  WOOD: "木造",
  LIGHT_STEEL: "軽量鉄骨",
  RC: "RC",
  OTHER: "その他",
};

const WATER_LABELS: Record<WaterType, string> = {
  PUBLIC: "水道",
  WELL: "井戸",
  OTHER: "その他",
};

const SEWAGE_LABELS: Record<SewageType, string> = {
  SEWER: "下水道",
  SEPTIC: "浄化槽",
  PIT: "汲み取り",
  OTHER: "その他",
};

const GAS_LABELS: Record<GasType, string> = {
  CITY: "都市ガス",
  LP: "LP",
  ALL_ELECTRIC: "オール電化",
  OTHER: "その他",
};

function structureLabel(v: StructureType | undefined): string {
  return v ? STRUCTURE_LABELS[v] ?? "—" : "—";
}

function waterLabel(v: WaterType | undefined): string {
  return v ? WATER_LABELS[v] ?? "—" : "—";
}

function sewageLabel(v: SewageType | undefined): string {
  return v ? SEWAGE_LABELS[v] ?? "—" : "—";
}

function gasLabel(v: GasType | undefined): string {
  return v ? GAS_LABELS[v] ?? "—" : "—";
}

function InputSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        {children}
      </div>
    </div>
  );
}

function InputDisplay({ input }: { input: PropertyInput }) {
  const s = input.target_segments;
  const targetLabels = [
    s.single && "単身",
    s.couple && "カップル",
    s.family && "ファミリー",
    s.investor && "投資家",
  ]
    .filter(Boolean)
    .join(" / ");
  return (
    <div className="space-y-4">
      <InputSection title="A. 物件基本">
        <p>物件名: {input.property_name || "—"}</p>
        <p>住所（町名まで可）: {input.address || "—"}</p>
      </InputSection>
      <InputSection title="B. 面積・間取り">
        <p>土地: {input.land_area_m2} ㎡ / 建物: {input.building_area_m2} ㎡</p>
        <p>間取り: {input.layout ?? "—"}</p>
        <p>階数: {input.floors ?? "—"}</p>
      </InputSection>
      <InputSection title="C. 立地・駐車場">
        <p>最寄駅（徒歩何分か）: {input.nearest_access || "—"}</p>
        <p>周辺環境: {input.surrounding_env ?? "—"}</p>
        <p>駐車場: {input.parking === "ON_SITE" ? "敷地内あり" : "なし"}</p>
        {input.monthly_parking_fee_yen != null && (
          <p>月額駐車料: {input.monthly_parking_fee_yen} 円</p>
        )}
        <p>接道: {input.road_access ?? "—"}</p>
      </InputSection>
      <InputSection title="D. 即NG判定">
        <p>再建築不可: {input.ng_rebuild_not_allowed ? "はい" : "いいえ"}</p>
        <p>接道義務未達: {input.ng_road_access_fail ? "はい" : "いいえ"}</p>
        <p>雨漏り原因不明: {input.ng_unknown_leak ? "はい" : "いいえ"}</p>
        <p>構造腐朽/傾き: {input.ng_structure_severe ? "はい" : "いいえ"}</p>
        <p>擁壁是正不可: {input.ng_retaining_wall_unfixable ? "はい" : "いいえ"}</p>
        <p>近隣トラブル: {input.ng_neighbor_trouble ? "はい" : "いいえ"}</p>
      </InputSection>
      <InputSection title="E. 法務・権利関係">
        <p>建築確認・検査済: {buildingLegalLabel((input as PropertyInput & { building_legal_status?: BuildingLegalStatus }).building_legal_status)}</p>
        <p>インスペ実施可能: {(input as PropertyInput & { inspection_available?: boolean }).inspection_available ? "できる" : "できない"}</p>
        <p>違反建築/既存不適格の懸念: {riskLevelLabel((input as PropertyInput & { nonconformity_risk?: RiskLevel }).nonconformity_risk)}</p>
        <p>権利関係の懸念: {riskLevelLabel((input as PropertyInput & { title_rights_risk?: RiskLevel }).title_rights_risk)}</p>
      </InputSection>
      <InputSection title="F. 建物・インフラ">
        <p>築年: {input.built_year}</p>
        <p>新耐震: {input.shin_taishin ? "はい" : "いいえ"}</p>
        <p>構造: {structureLabel(input.structure_type)}</p>
        <p>雨漏り有無: {input.water_leak ? "有" : "無"}</p>
        <p>傾き: {tiltLabel(input.tilt)}</p>
        <p>上水: {waterLabel(input.water)} / 下水: {sewageLabel(input.sewage)} / ガス: {gasLabel(input.gas)}</p>
        <p>電気: {input.electricity ?? "—"}</p>
        <p>状態メモ: {input.condition_note || "—"}</p>
      </InputSection>
      <InputSection title="G. 工事・回転">
        <p>
          ◯想定リフォーム費:{" "}
          {input.estimated_renovation_yen != null
            ? `${(input.estimated_renovation_yen / 10000).toLocaleString()}万円`
            : "—"}
        </p>
        <div>
          <p className="mb-1">◯工事内容（チェックボックス）</p>
          <ul className="list-inside space-y-0.5 text-sm">
            {input.construction_items?.water_system && (
              <li>水回り交換（キッチン・浴室・トイレ）</li>
            )}
            {input.construction_items?.wallpaper_full && (
              <li>内装クロス全面</li>
            )}
            {input.construction_items?.floor_partial && (
              <li>床一部張替え</li>
            )}
            {input.construction_items?.exterior_partial && (
              <li>外壁部分補修</li>
            )}
            {!input.construction_items?.water_system &&
              !input.construction_items?.wallpaper_full &&
              !input.construction_items?.floor_partial &&
              !input.construction_items?.exterior_partial && (
                <li className="text-muted-foreground">—</li>
              )}
          </ul>
        </div>
        <p>
          ◯希望売却価格:{" "}
          {input.desired_sale_price_yen != null
            ? `${(input.desired_sale_price_yen / 10000).toLocaleString()}万円`
            : "—"}
        </p>
      </InputSection>
      <InputSection title="H. 想定賃貸条件">
        {input.expected_rent_yen != null && (
          <p>想定賃料: {input.expected_rent_yen / 10000} 万円</p>
        )}
        <p>ペット可: {input.pet_allowed ? "はい" : "いいえ"}</p>
        {input.pet_note && <p>ペット備考: {input.pet_note}</p>}
        <p>ターゲット: {targetLabels || "—"}</p>
      </InputSection>
      <InputSection title="I. 補足">
        <p>{input.remarks || "—"}</p>
      </InputSection>
    </div>
  );
}

export default function JudgementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [record, setRecord] = useState<JudgementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [reJudging, setReJudging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getById(id).then((r) => {
      setRecord(r ?? null);
      setLoading(false);
    });
  }, [id]);

  const handleReJudge = async () => {
    if (!record) return;
    setReJudging(true);
    try {
      const settings = await getGptSettings();
      const output = await runJudge(record.input, settings);
      const prompt_snapshot: PromptSnapshot = {
        name: settings.prompt_name,
        version: settings.prompt_version,
        content: settings.prompt_content,
        model: OPENAI_LATEST_MODEL,
        temperature: settings.temperature,
      };
      const [area_profile, price_feedback] = await Promise.all([
        fetchAreaProfile(record.input.address),
        fetchPriceFeedback(
          record.input.address,
          record.input.desired_sale_price_yen
        ),
      ]);
      const newRecord = await createJudgement({
        input: record.input,
        output,
        prompt_snapshot,
        status: "COMPLETED",
        area_profile: area_profile ?? null,
        price_feedback: price_feedback ?? null,
      });
      toast.success("再判定を保存しました");
      router.push(`/admin/judgements/${newRecord.id}`);
    } finally {
      setReJudging(false);
    }
  };

  const handleDelete = async () => {
    if (!record || !confirm("この判定記録を削除しますか？")) return;
    setDeleting(true);
    try {
      await deleteRecord(id);
      toast.success("削除しました");
      router.push("/admin/judgements");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">読み込み中…</div>;
  }
  if (!record) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">該当する記録が見つかりません。</p>
        <Link href="/admin/judgements" className="text-primary underline">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  const { input, output, prompt_snapshot } = record;
  const verdictVariant =
    output.verdict === "OK"
      ? "default"
      : output.verdict === "NG"
        ? "destructive"
        : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {input.property_name || "（物件名なし）"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {formatDate(record.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReJudge}
            disabled={reJudging}
          >
            {reJudging ? "再判定中…" : "再判定（履歴として保存）"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "削除中…" : "削除"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左: 入力 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">入力（物件情報）</CardTitle>
          </CardHeader>
          <CardContent>
            <InputDisplay input={input} />
          </CardContent>
        </Card>

        {/* 右: 出力 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">判定結果</CardTitle>
                <Badge variant={verdictVariant}>{output.verdict}</Badge>
                <span className="text-muted-foreground text-sm">
                  信頼度 {output.confidence}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {output.reasons.length > 0 && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h4 className="mb-1 text-sm font-medium">判定理由</h4>
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-1.5 mt-3 text-sm font-medium">
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-inside list-disc space-y-0.5 text-sm">
                          {children}
                        </ul>
                      ),
                      p: ({ children }) => (
                        <p className="mb-1 text-sm">{children}</p>
                      ),
                    }}
                  >
                    {output.reasons.join("\n")}
                  </ReactMarkdown>
                </div>
              )}
              {output.missing_checks.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">未確認項目</h4>
                  <ul className="list-inside list-disc text-sm">
                    {output.missing_checks.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {output.risks.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">リスク</h4>
                  <ul className="space-y-1 text-sm">
                    {output.risks.map((risk, i) => (
                      <li key={i}>
                        <span className="font-medium">{risk.title}:</span>{" "}
                        {risk.impact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(output.low_points?.length ?? 0) > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">低評価ポイント</h4>
                  <ul className="list-inside list-disc text-sm">
                    {(output.low_points ?? []).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {output.recommended_next_actions.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">推奨アクション</h4>
                  <ul className="list-inside list-disc text-sm">
                    {output.recommended_next_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {record.price_feedback && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">希望価格の妥当性</h4>
                  <p className="mb-1 font-medium text-sm">
                    {record.price_feedback.verdict}
                  </p>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-1 text-sm">{children}</p>
                        ),
                      }}
                    >
                      {record.price_feedback.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {record.area_profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  住所の特徴
                  {record.area_profile.used_web_search
                    ? "（Web検索 + AI により要約）"
                    : "（AI により生成）"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-1 text-sm">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-inside list-disc text-sm">
                          {children}
                        </ul>
                      ),
                    }}
                  >
                    {record.area_profile.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">プロンプトスナップショット</CardTitle>
              <CardDescription>
                判定時点のプロンプト設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>名称: {prompt_snapshot.name || "—"}</p>
              <p>バージョン: {prompt_snapshot.version || "—"}</p>
              <p>モデル: {prompt_snapshot.model || "—"}</p>
              <p>Temperature: {prompt_snapshot.temperature}</p>
              <Accordion type="single" collapsible>
                <AccordionItem value="content">
                  <AccordionTrigger>プロンプト本文</AccordionTrigger>
                  <AccordionContent>
                    <pre className="whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs">
                      {prompt_snapshot.content || "（未設定）"}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
