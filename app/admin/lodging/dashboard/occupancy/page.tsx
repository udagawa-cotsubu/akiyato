"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInns, fetchReservations } from "@/lib/lodging/repository";
import type { Inn, Reservation } from "@/lib/types/lodging";
import {
  buildStayNights,
  buildWeeklyOccupancy,
  getDashboardWeekRange,
  weekKeyToDateRange,
} from "@/lib/lodging/metrics";
import { downloadCsv } from "@/lib/csv";
import { WeeklyOccupancyChart } from "@/components/lodging/WeeklyOccupancyChart";
import {
  WeeklyOccupancyYearCompareChart,
  buildOccupancyYearCompareData,
} from "@/components/lodging/WeeklyOccupancyYearCompareChart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function LodgingOccupancyPage() {
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

  const weeklyOccupancy = useMemo(() => {
    if (!reservations.length) return [];
    const stayNights = buildStayNights(reservations);
    return buildWeeklyOccupancy(stayNights);
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
    const filename = `稼働率_${safeName}_${dateStr}.csv`;
    const headers = ["期間", "宿泊日数"];

    if (compareByYear) {
      const innData = weeklyOccupancy.filter((p) => p.innId === selectedCsvInn.id);
      const yearData = buildOccupancyYearCompareData(innData);
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
        const point = weeklyOccupancy.find(
          (p) => p.weekKey === weekKey && p.innId === selectedCsvInn.id
        );
        return [weekKeyToDateRange(weekKey), point?.stayedNights ?? 0];
      });
      downloadCsv(headers, rows, filename);
    }
  }, [compareByYear, dashboardWeeks, selectedCsvInn, weeklyOccupancy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">稼働率</h2>
          <p className="text-sm text-muted-foreground">
            宿ごとの週次稼働率（泊数÷7日）を表示します。
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
              const innData = weeklyOccupancy.filter((p) => p.innId === inn.id);
              const yearCompareData = buildOccupancyYearCompareData(innData);
              return (
                <div key={inn.id} className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {inn.name} の週次稼働率（年比較）
                  </h3>
                  <WeeklyOccupancyYearCompareChart
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
              const innData = weeklyOccupancy.filter((p) => p.innId === inn.id);
              return (
                <div key={inn.id} className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {inn.name} の週次稼働率（分子=泊数, 分母=7日）
                  </h3>
                  <WeeklyOccupancyChart data={innData} weeks={dashboardWeeks} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
