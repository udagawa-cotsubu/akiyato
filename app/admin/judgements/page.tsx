"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JudgementRecord, OutcomeStatus } from "@/lib/types/judgement";
import type { Verdict } from "@/lib/types/judgement";
import { list } from "@/lib/repositories/judgementsRepository";

const OUTCOME_LABELS: Record<OutcomeStatus | "ALL", string> = {
  ALL: "すべて",
  pending: "未記録",
  visited: "訪問",
  passed: "見送り",
  acquired: "買取",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JudgementsListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<JudgementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<Verdict | "ALL">("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeStatus | "ALL">("ALL");

  useEffect(() => {
    list().then((data) => {
      setRecords(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let r = records;
    if (verdictFilter !== "ALL") {
      r = r.filter((rec) => {
        const v = rec.output.verdict as string;
        if (verdictFilter === "GO") return v === "GO" || v === "OK";
        if (verdictFilter === "NO_GO") return v === "NO_GO" || v === "NG";
        return v === verdictFilter;
      });
    }
    if (outcomeFilter !== "ALL") {
      r = r.filter((rec) => (rec.outcome_status ?? "pending") === outcomeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((rec) => {
        const postal = (rec.input as { postal_code?: string }).postal_code ?? "";
        return (
          rec.input.property_name.toLowerCase().includes(q) ||
          rec.input.address.toLowerCase().includes(q) ||
          postal.toLowerCase().includes(q)
        );
      });
    }
    return r;
  }, [records, search, verdictFilter, outcomeFilter]);

  if (loading) {
    return <div className="text-muted-foreground">読み込み中…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">判定結果管理</h2>
        <p className="text-muted-foreground text-sm">
          保存された判定依頼の一覧。行をクリックで詳細へ。
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="物件名・住所で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={verdictFilter}
          onValueChange={(v) => setVerdictFilter(v as Verdict | "ALL")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="判定結果で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">すべて</SelectItem>
            <SelectItem value="GO">GO</SelectItem>
            <SelectItem value="NO_GO">NO-GO</SelectItem>
            <SelectItem value="HOLD">HOLD</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={outcomeFilter}
          onValueChange={(v) => setOutcomeFilter(v as OutcomeStatus | "ALL")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="結果で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            {(["ALL", "pending", "visited", "passed", "acquired"] as const).map((k) => (
              <SelectItem key={k} value={k}>
                {OUTCOME_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              {records.length === 0
                ? "まだ判定結果が保存されていません。判定フォームで「問い合わせとして保存」するとここに表示されます。"
                : "検索・フィルタに一致する結果はありません。"}
            </p>
            {records.length === 0 && (
              <Link
                href="/judge"
                className="cursor-pointer mt-4 text-primary underline"
              >
                判定フォームへ
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* モバイル: カード一覧 */}
          <div className="space-y-3 md:hidden">
            {filtered.map((rec) => {
              const v = rec.output.verdict as string;
              return (
                <Card
                  key={rec.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                  onClick={() => router.push(`/admin/judgements/${rec.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {rec.input.property_name || "（未入力）"}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {formatDate(rec.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          v === "GO" || v === "OK"
                            ? "default"
                            : v === "NO_GO" || v === "NG"
                              ? "destructive"
                              : "secondary"
                        }
                        className="shrink-0"
                      >
                        {v === "NO_GO" || v === "NG" ? "NO-GO" : v === "OK" ? "GO" : v}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-muted-foreground text-sm">
                      <span>信頼度 {rec.output.confidence}%</span>
                      <span>未確認 {rec.output.missing_checks.length}</span>
                      <span>リスク {rec.output.risks.length}</span>
                      <span>結果: {OUTCOME_LABELS[rec.outcome_status ?? "pending"]}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {/* デスクトップ: テーブル */}
          <div className="hidden md:block overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>物件名</TableHead>
                  <TableHead>判定</TableHead>
                  <TableHead>結果</TableHead>
                  <TableHead>信頼度</TableHead>
                  <TableHead className="text-center">未確認</TableHead>
                  <TableHead className="text-center">リスク</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rec) => (
                  <TableRow
                    key={rec.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/judgements/${rec.id}`)}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(rec.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {rec.input.property_name || "（未入力）"}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const v = rec.output.verdict as string;
                        return (
                          <Badge
                            variant={
                              v === "GO" || v === "OK"
                                ? "default"
                                : v === "NO_GO" || v === "NG"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {v === "NO_GO" || v === "NG" ? "NO-GO" : v === "OK" ? "GO" : v}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {OUTCOME_LABELS[rec.outcome_status ?? "pending"]}
                    </TableCell>
                    <TableCell>{rec.output.confidence}%</TableCell>
                    <TableCell className="text-center">
                      {rec.output.missing_checks.length}
                    </TableCell>
                    <TableCell className="text-center">
                      {rec.output.risks.length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
