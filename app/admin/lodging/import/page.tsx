"use client";

import { useEffect, useMemo, useState } from "react";
import { importCsvTexts, fetchInns, fetchReservations, resetLodgingData } from "@/lib/lodging/repository";
import type { Inn, Reservation, ReservationFilter } from "@/lib/types/lodging";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function LodgingImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inns, setInns] = useState<Inn[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<ReservationFilter>({});

  useEffect(() => {
    void (async () => {
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
    })();
  }, []);

  const filteredReservations = useMemo(() => {
    if (!reservations.length) return [];
    const { innId, source, searchText } = filter;
    const q = searchText?.trim().toLowerCase();

    return reservations.filter((r) => {
      if (innId && r.innId !== innId) return false;
      if (source && r.source && r.source !== source) return false;

      if (q) {
        const haystack = `${r.source ?? ""} ${r.status ?? ""} ${r.ratePlan ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reservations, filter]);

  const uniqueSources = useMemo(
    () =>
      Array.from(new Set(reservations.map((r) => r.source).filter((v): v is string => !!v))).sort(),
    [reservations],
  );

  const sortedInns = useMemo(
    () => [...inns].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [inns],
  );

  const handleFiles = async (files: FileList | null) => {
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

      await importCsvTexts(texts);
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
      toast.success(`${texts.length} 件の CSV を取り込みました`);
    } catch (e) {
      toast.error("CSV の取り込みに失敗しました");
      console.error(e);
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    await handleFiles(event.dataTransfer.files);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">予約インポート</h2>
        <p className="text-sm text-muted-foreground">
          宿泊予約のCSVを取り込んで一覧表示します。アップロードはこの画面上部から行えます。
        </p>
      </div>

      {/* アップロード UI */}
      <div className="space-y-3">
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragActive ? "border-primary bg-muted/40" : "border-muted-foreground/30 bg-muted/20"
          }`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <p className="font-medium">CSV ファイルをここにドラッグ＆ドロップ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            または、下のボタンからファイルを選択（複数ファイル対応）
          </p>
          <div className="mt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-background px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-border hover:bg-muted">
              <span>ファイルを選択</span>
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>
          {uploading && (
            <p className="mt-2 text-xs text-muted-foreground">取り込み中です…</p>
          )}
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">キーワード検索</label>
          <Input
            placeholder="予約サイト・プラン名で検索"
            value={filter.searchText ?? ""}
            onChange={(e) => setFilter((prev) => ({ ...prev, searchText: e.target.value }))}
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">宿</label>
          <Select
            value={filter.innId ?? "ALL"}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                innId: value === "ALL" ? undefined : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="すべての宿" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">すべて</SelectItem>
              {sortedInns.map((inn) => (
                <SelectItem key={inn.id} value={inn.id}>
                  {inn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">予約サイト</label>
          <Select
            value={filter.source ?? "ALL"}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                source: value === "ALL" ? undefined : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="すべてのサイト" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">すべて</SelectItem>
              {uniqueSources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <Button
            variant="outline"
            onClick={() => setFilter({})}
          >
            条件クリア
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!window.confirm("宿・予約データをすべて削除します。よろしいですか？")) return;
              await resetLodgingData();
              setInns([]);
              setReservations([]);
              toast.success("宿泊データをすべて削除しました");
            }}
          >
            全データ削除
          </Button>
        </div>
      </div>

      {/* 一覧 */}
      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {reservations.length === 0
              ? "まだ宿泊データが取り込まれていません。上のエリアから CSV をアップロードしてください。"
              : "検索・フィルタ条件に一致する予約がありません。"}
          </CardContent>
        </Card>
      ) : (
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
              {filteredReservations.map((r, index) => {
                const inn = inns.find((i) => i.id === r.innId);
                const innLabel = inn?.name ?? r.innName ?? "-";
                return (
                  <TableRow key={`${r.checkIn ?? ""}-${index}`}>
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
      )}
    </div>
  );
}

