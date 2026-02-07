"use client";

import { useEffect, useMemo, useState } from "react";
import { importCsvTexts, fetchInns, fetchReservations } from "@/lib/lodging/repository";
import type { Inn, Reservation } from "@/lib/types/lodging";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { postReservationImportNotification } from "@/lib/integration/slackReservations";

type ImportSourceType = "checkin" | "reservation" | "cancel";

export default function LodgingImportPage() {
  const [dragActive, setDragActive] = useState<Record<ImportSourceType, boolean>>({
    checkin: false,
    reservation: false,
    cancel: false,
  });
  const [uploading, setUploading] = useState(false);
  const [inns, setInns] = useState<Inn[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [page, setPage] = useState(1);

  const pageSize = 20;

  useEffect(() => {
    void (async () => {
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
      setPage(1);
    })();
  }, []);

  const handleFiles = async (sourceType: ImportSourceType, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const texts: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".csv")) continue;
        const text = await file.text();
        texts.push(text);
      }
      if (texts.length === 0) {
        toast.error("CSV ファイルが選択されていません");
        return;
      }

      const { reservationsCount, reservationsSummary } = await importCsvTexts(texts, {
        importSourceType: sourceType,
      });
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
      toast.success(`${texts.length} 件の CSV を取り込みました`);

      if (sourceType === "reservation" || sourceType === "cancel") {
        void postReservationImportNotification({
          importSourceType: sourceType,
          totalCount: reservationsCount,
          reservations: reservationsSummary,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "CSV の取り込みに失敗しました";
      toast.error(message);
      console.error(e);
    } finally {
      setUploading(false);
      setDragActive((prev) => ({
        ...prev,
        [sourceType]: false,
      }));
    }
  };

  const createDropHandlers = (sourceType: ImportSourceType) => {
    const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive((prev) => ({ ...prev, [sourceType]: false }));
      await handleFiles(sourceType, event.dataTransfer.files);
    };

    const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive((prev) => {
        if (prev[sourceType]) return prev;
        return { ...prev, [sourceType]: true };
      });
    };

    const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive((prev) => ({ ...prev, [sourceType]: false }));
    };

    return { onDrop, onDragOver, onDragLeave };
  };

  const checkinHandlers = createDropHandlers("checkin");
  const reservationHandlers = createDropHandlers("reservation");
  const cancelHandlers = createDropHandlers("cancel");

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      const aDate = a.bookingDate ?? "";
      const bDate = b.bookingDate ?? "";
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      // 予約日が新しいものが上（降順）
      return bDate.localeCompare(aDate);
    });
  }, [reservations]);

  const totalPages = Math.max(1, Math.ceil(sortedReservations.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedReservations = sortedReservations.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">予約インポート</h2>
        <p className="text-sm text-muted-foreground">
          宿泊予約のCSVを取り込んで一覧表示します。アップロードはこの画面上部から行えます。
        </p>
      </div>

      {/* アップロード UI */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* チェックイン日エリア */}
        <div className="flex h-full flex-col space-y-2">
          <h3 className="text-sm font-semibold">チェックイン日ベースの予約インポート</h3>
          <p className="text-xs text-muted-foreground">
            チェックイン日を基準にしたレポートなどに使う想定のデータです。Slack通知は行われません。
          </p>
          <div
            className={`mt-2 flex min-h-[160px] flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              dragActive.checkin ? "border-primary bg-muted/40" : "border-muted-foreground/30 bg-muted/20"
            }`}
            onDrop={checkinHandlers.onDrop}
            onDragOver={checkinHandlers.onDragOver}
            onDragLeave={checkinHandlers.onDragLeave}
          >
            <p className="font-medium text-sm">CSV をドラッグ＆ドロップ</p>
            <p className="mt-1 text-[11px] text-muted-foreground">または、ボタンからファイルを選択</p>
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border hover:bg-muted">
                <span>ファイルを選択</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles("checkin", e.target.files)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 予約日エリア */}
        <div className="flex h-full flex-col space-y-2">
          <h3 className="text-sm font-semibold">予約日ベースの予約インポート（Slack通知あり）</h3>
          <p className="text-xs text-muted-foreground">
            予約日を基準にした実績把握向けのデータです。このエリアからインポートすると、Slackにサマリが通知されます。
          </p>
          <div
            className={`mt-2 flex min-h-[160px] flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              dragActive.reservation ? "border-primary bg-muted/40" : "border-muted-foreground/30 bg-muted/20"
            }`}
            onDrop={reservationHandlers.onDrop}
            onDragOver={reservationHandlers.onDragOver}
            onDragLeave={reservationHandlers.onDragLeave}
          >
            <p className="font-medium text-sm">CSV をドラッグ＆ドロップ</p>
            <p className="mt-1 text-[11px] text-muted-foreground">または、ボタンからファイルを選択</p>
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border hover:bg-muted">
                <span>ファイルを選択</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles("reservation", e.target.files)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* キャンセル日エリア */}
        <div className="flex h-full flex-col space-y-2">
          <h3 className="text-sm font-semibold">キャンセル日ベースの予約インポート（Slack通知あり）</h3>
          <p className="text-xs text-muted-foreground">
            キャンセル日を基準にした状況把握向けのデータです。このエリアからインポートすると、Slackにサマリが通知されます。
          </p>
          <div
            className={`mt-2 flex min-h-[160px] flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              dragActive.cancel ? "border-primary bg-muted/40" : "border-muted-foreground/30 bg-muted/20"
            }`}
            onDrop={cancelHandlers.onDrop}
            onDragOver={cancelHandlers.onDragOver}
            onDragLeave={cancelHandlers.onDragLeave}
          >
            <p className="font-medium text-sm">CSV をドラッグ＆ドロップ</p>
            <p className="mt-1 text-[11px] text-muted-foreground">または、ボタンからファイルを選択</p>
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border hover:bg-muted">
                <span>ファイルを選択</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles("cancel", e.target.files)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {uploading && (
        <p className="text-xs text-muted-foreground">CSV を取り込み中です…</p>
      )}

      {/* 一覧 */}
      {sortedReservations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            まだ宿泊データが取り込まれていません。上のエリアから CSV をアップロードしてください。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              全 {sortedReservations.length} 件中{" "}
              {startIndex + 1}–{Math.min(startIndex + pageSize, sortedReservations.length)} 件を表示
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                前の20件
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                次の20件
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>宿</TableHead>
                  <TableHead>予約日</TableHead>
                  <TableHead>チェックイン</TableHead>
                  <TableHead>チェックアウト</TableHead>
                  <TableHead>泊数</TableHead>
                  <TableHead>人数（大人/子供/幼児）</TableHead>
                  <TableHead>予約サイト</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>販売金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedReservations.map((r, index) => {
                  const inn = inns.find((i) => i.id === r.innId);
                  const innLabel = inn?.name ?? r.innName ?? "-";
                  return (
                    <TableRow key={`${r.checkIn ?? ""}-${startIndex + index}`}>
                      <TableCell className="font-medium">
                        {innLabel}
                      </TableCell>
                      <TableCell>{r.bookingDate ?? "-"}</TableCell>
                      <TableCell>{r.checkIn ?? "-"}</TableCell>
                      <TableCell>{r.checkOut ?? "-"}</TableCell>
                      <TableCell>{r.nights ?? "-"}</TableCell>
                      <TableCell>
                        {r.status === "ブロック"
                          ? "-"
                          : `${r.adults ?? 0} / ${r.children ?? 0} / ${r.infants ?? 0}`}
                      </TableCell>
                      <TableCell>{r.source ?? "-"}</TableCell>
                      <TableCell>
                        {r.status ?? "-"}
                      </TableCell>
                      <TableCell>
                        {r.saleAmount != null ? r.saleAmount.toLocaleString("ja-JP") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

