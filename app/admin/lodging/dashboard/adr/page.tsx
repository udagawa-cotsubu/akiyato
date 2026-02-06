"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInns, fetchReservations } from "@/lib/lodging/repository";
import type { Inn, Reservation } from "@/lib/types/lodging";
import { buildWeeklyAdr, getDashboardWeekRange, weekKeyToDateRange } from "@/lib/lodging/metrics";
import { downloadCsv } from "@/lib/csv";
import { WeeklyAdrChart } from "@/components/lodging/WeeklyAdrChart";
import {
  WeeklyAdrYearCompareChart,
  buildAdrYearCompareData,
} from "@/components/lodging/WeeklyAdrYearCompareChart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function LodgingAdrPage() {
  const [inns, setInns] = useState<Inn[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [compareByYear, setCompareByYear] = useState(true);
  const [csvInnId, setCsvInnId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
    })();
  }, []);

  const dashboardWeeks = useMemo(() => getDashboardWeekRange(), []);
  const chartMinWidth = dashboardWeeks.length * 22;

  const weeklyAdr = useMemo(() => {
    if (!reservations.length) return [];
    return buildWeeklyAdr(reservations);
  }, [reservations]);

  const sortedInns = useMemo(
    () =>
      [...inns].sort((a, b) => {
        const keyA = a.displayName ?? (a.tag ? `${a.tag}.${a.name}` : a.name);
        const keyB = b.displayName ?? (b.tag ? `${b.tag}.${b.name}` : b.name);
        return keyA.localeCompare(keyB, "ja");
      }),
    [inns],
  );

  const selectedCsvInn = sortedInns.find((inn) => inn.id === csvInnId) ?? sortedInns[0];
  const canExportCsv = !!selectedCsvInn;

  const handleExportCsv = useCallback(() => {
    if (!selectedCsvInn) return;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeName = selectedCsvInn.name.replace(/[/\\?*:"|]/g, "_");
    const filename = `ADR_${safeName}_${dateStr}.csv`;
    const headers = ["期間", "ADR"];

    if (compareByYear) {
      const innData = weeklyAdr.filter((p) => p.innId === selectedCsvInn.id);
      const yearData = buildAdrYearCompareData(innData);
      const rows: (string | number)[][] = [];
      for (const year of [2024, 2025, 2026]) {
        for (let w = 1; w <= 53; w += 1) {
          const weekLabel = `${w}W`;
          const yearRow = yearData.find((r) => r.weekLabel === weekLabel);
          const value = yearRow?.[String(year) as "2024" | "2025" | "2026"] ?? 0;
          const weekKey = `${year} ${w}W`;
          rows.push([weekKeyToDateRange(weekKey), value]);
        }
      }
      downloadCsv(headers, rows, filename);
    } else {
      const rows: (string | number)[][] = dashboardWeeks.map((weekKey) => {
        const point = weeklyAdr.find(
          (p) => p.weekKey === weekKey && p.innId === selectedCsvInn.id
        );
        return [weekKeyToDateRange(weekKey), point ? Math.round(point.adr) : 0];
      });
      downloadCsv(headers, rows, filename);
    }
  }, [compareByYear, dashboardWeeks, selectedCsvInn, weeklyAdr]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">ADR（平均単価）</h2>
          <p className="text-sm text-muted-foreground">
            宿ごとの週次ADR（販売金額合計÷宿泊数＝1泊あたりの単価）を表示します。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={csvInnId || sortedInns[0]?.id || ""}
            onValueChange={setCsvInnId}
          >
            <SelectTrigger className="w-[200px]" size="sm">
              <SelectValue placeholder="宿を選択" />
            </SelectTrigger>
            <SelectContent>
              {sortedInns.map((inn) => (
                <SelectItem key={inn.id} value={inn.id}>
                  {inn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!canExportCsv}
          >
            CSV出力
          </Button>
        </div>
      </div>

      {/* 年ごと比較 / 並べて表示 */}
      <div className="flex items-center gap-2">
        <span
          className={`text-sm ${compareByYear ? "font-semibold text-foreground" : "text-muted-foreground"}`}
        >
          年ごと比較
        </span>
        <Switch
          checked={!compareByYear}
          onCheckedChange={(checked) => setCompareByYear(!checked)}
          aria-label="年ごと比較 / 並べて表示"
        />
        <span
          className={`text-sm ${!compareByYear ? "font-semibold text-foreground" : "text-muted-foreground"}`}
        >
          並べて表示
        </span>
      </div>

      {compareByYear ? (
        /* 年比較: 1W左固定・1年分の領域で2024/2025/2026を横並び */
        <div className="overflow-x-auto">
          <div className="space-y-4" style={{ minWidth: 53 * 18 }}>
            {sortedInns.map((inn) => {
              const innData = weeklyAdr.filter((p) => p.innId === inn.id);
              const yearCompareData = buildAdrYearCompareData(innData);
              return (
                <div key={inn.id} className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {inn.name} の週次ADR（年比較）
                  </h3>
                  <WeeklyAdrYearCompareChart
                    data={yearCompareData}
                    innName={inn.name}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 通常: 横スクロールで全週表示 */
        <div className="overflow-x-auto">
          <div className="space-y-4" style={{ minWidth: chartMinWidth }}>
            {sortedInns.map((inn) => {
              const innData = weeklyAdr.filter((p) => p.innId === inn.id);
              return (
                <div key={inn.id} className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {inn.name} の週次ADR（1泊あたりの単価）
                  </h3>
                  <WeeklyAdrChart data={innData} weeks={dashboardWeeks} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
