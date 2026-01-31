"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import type { PropertyInput } from "@/lib/types/property";
import type { JudgementRecord } from "@/lib/types/judgement";
import { getById, create as createJudgement, deleteRecord } from "@/lib/repositories/judgementsRepository";
import { get as getGptSettings } from "@/lib/repositories/gptSettingsRepository";
import { judgeWithStub } from "@/lib/judge/judgeWithStub";
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
        <p>住所: {input.address || "—"}</p>
        <p>エリア: {input.area || "—"}</p>
      </InputSection>
      <InputSection title="B. 面積">
        <p>土地: {input.land_area_m2} ㎡ / 建物: {input.building_area_m2} ㎡</p>
      </InputSection>
      <InputSection title="C. 立地・駐車場">
        <p>最寄: {input.nearest_access || "—"}</p>
        <p>駐車場: {input.parking === "ON_SITE" ? "敷地内あり" : "なし"}</p>
        {input.monthly_parking_fee_yen != null && (
          <p>月額駐車料: {input.monthly_parking_fee_yen} 円</p>
        )}
      </InputSection>
      <InputSection title="D. 即NG判定">
        <p>再建築不可: {input.ng_rebuild_not_allowed ? "YES" : "NO"}</p>
        <p>接道義務未達: {input.ng_road_access_fail ? "YES" : "NO"}</p>
        <p>雨漏り原因不明: {input.ng_unknown_leak ? "YES" : "NO"}</p>
        <p>構造腐朽/傾き: {input.ng_structure_severe ? "YES" : "NO"}</p>
        <p>擁壁是正不可: {input.ng_retaining_wall_unfixable ? "YES" : "NO"}</p>
        <p>近隣トラブル: {input.ng_neighbor_trouble ? "YES" : "NO"}</p>
        <p>ローン不可両方: {input.loan_impossible_both}</p>
      </InputSection>
      <InputSection title="E. 建物・インフラ">
        <p>築年: {input.built_year}</p>
        <p>新耐震: {input.shin_taishin ? "はい" : "いいえ"}</p>
        <p>構造: {input.structure_type}</p>
        <p>基礎: {input.foundation || "—"}</p>
        <p>上水: {input.water} / 下水: {input.sewage} / ガス: {input.gas}</p>
        <p>状態メモ: {input.condition_note || "—"}</p>
      </InputSection>
      <InputSection title="F. 想定賃貸条件">
        {input.expected_rent_yen != null && (
          <p>想定賃料: {input.expected_rent_yen} 円</p>
        )}
        <p>ペット可: {input.pet_allowed ? "はい" : "いいえ"}</p>
        {input.pet_note && <p>ペット備考: {input.pet_note}</p>}
        <p>ターゲット: {targetLabels || "—"}</p>
      </InputSection>
      <InputSection title="G. 工事・回転">
        <p>90日以内: {input.within_90_days ? "はい" : "いいえ"}</p>
        <p>MIN仕様成立: {input.min_spec_ok ? "はい" : "いいえ"}</p>
        <p>S+一部可能: {input.s_plus_partial_ok ? "はい" : "いいえ"}</p>
        <p>説明不要まで再生可: {input.can_restore_no_explain ? "はい" : "いいえ"}</p>
      </InputSection>
      <InputSection title="H. 補足">
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
      const output = judgeWithStub(record.input, settings);
      const prompt_snapshot: PromptSnapshot = settings
        ? {
            name: settings.prompt_name,
            version: settings.prompt_version,
            content: settings.prompt_content,
            model: settings.model,
            temperature: settings.temperature,
          }
        : {
            name: "",
            version: "",
            content: "",
            model: "",
            temperature: 0,
          };
      const newRecord = await createJudgement({
        input: record.input,
        output,
        prompt_snapshot,
        status: "COMPLETED",
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
                <div>
                  <h4 className="mb-1 text-sm font-medium">判定理由</h4>
                  <ul className="list-inside list-disc text-sm">
                    {output.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
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
            </CardContent>
          </Card>

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
