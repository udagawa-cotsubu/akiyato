"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInns, fetchReservations } from "@/lib/lodging/repository";
import type { Inn, Reservation } from "@/lib/types/lodging";
import {
  buildStayNights,
  buildWeeklyAdr,
  buildWeeklyOccupancy,
  buildWeeklySales,
  getDashboardWeekRange,
  weekKeyToDateRange,
} from "@/lib/lodging/metrics";
import { downloadCsv } from "@/lib/csv";
import { WeeklyAdrChart } from "@/components/lodging/WeeklyAdrChart";
import {
  WeeklyAdrYearCompareChart,
  buildAdrYearCompareData,
} from "@/components/lodging/WeeklyAdrYearCompareChart";
import { WeeklyOccupancyChart } from "@/components/lodging/WeeklyOccupancyChart";
import {
  WeeklyOccupancyYearCompareChart,
  buildOccupancyYearCompareData,
} from "@/components/lodging/WeeklyOccupancyYearCompareChart";
import { WeeklySalesChart } from "@/components/lodging/WeeklySalesChart";
import {
  WeeklySalesYearCompareChart,
  buildSalesYearCompareData,
} from "@/components/lodging/WeeklySalesYearCompareChart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function LodgingDashboardPage() {
  const [inns, setInns] = useState<Inn[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [compareByYear, setCompareByYear] = useState(true);
  const [selectedInnId, setSelectedInnId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const [innList, reservationList] = await Promise.all([
        fetchInns(),
        fetchReservations(),
      ]);
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

  const weeklyAdr = useMemo(() => {
    if (!reservations.length) return [];
    return buildWeeklyAdr(reservations);
  }, [reservations]);

  const weeklySales = useMemo(() => {
    if (!reservations.length) return [];
    return buildWeeklySales(reservations);
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

  const selectedInn =
    sortedInns.find((inn) => inn.id === selectedInnId) ?? sortedInns[0];
  const canExportCsv = !!selectedInn;

  const handleExportCsv = useCallback(() => {
    if (!selectedInn) return;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeName = selectedInn.name.replace(/[/\\?*:"|]/g, "_");
    const filename = `レポート_${safeName}_${dateStr}.csv`;
    const headers = ["期間", "稼働率", "ADR", "売上"];

    const rows: (string | number)[][] = dashboardWeeks.map((weekKey) => {
      const occ = weeklyOccupancy.find(
        (p) => p.weekKey === weekKey && p.innId === selectedInn.id
      );
      const adr = weeklyAdr.find(
        (p) => p.weekKey === weekKey && p.innId === selectedInn.id
      );
      const sales = weeklySales.find(
        (p) => p.weekKey === weekKey && p.innId === selectedInn.id
      );
      const occupancyPct =
        occ != null ? Math.round((occ.occupancy ?? 0) * 1000) / 10 : 0;
      const adrVal = adr != null ? Math.round(adr.adr) : 0;
      const salesVal = sales?.totalSaleAmount ?? 0;
      return [
        weekKeyToDateRange(weekKey),
        occupancyPct,
        adrVal,
        salesVal,
      ];
    });
    downloadCsv(headers, rows, filename);
  }, [
    dashboardWeeks,
    selectedInn,
    weeklyOccupancy,
    weeklyAdr,
    weeklySales,
  ]);

  const occupancyInnData = useMemo(
    () =>
      selectedInn
        ? weeklyOccupancy.filter((p) => p.innId === selectedInn.id)
        : [],
    [selectedInn, weeklyOccupancy],
  );
  const adrInnData = useMemo(
    () =>
      selectedInn ? weeklyAdr.filter((p) => p.innId === selectedInn.id) : [],
    [selectedInn, weeklyAdr],
  );
  const salesInnData = useMemo(
    () =>
      selectedInn ? weeklySales.filter((p) => p.innId === selectedInn.id) : [],
    [selectedInn, weeklySales],
  );

  const occupancyYearData = useMemo(
    () => buildOccupancyYearCompareData(occupancyInnData),
    [occupancyInnData],
  );
  const adrYearData = useMemo(
    () => buildAdrYearCompareData(adrInnData),
    [adrInnData],
  );
  const salesYearData = useMemo(
    () => buildSalesYearCompareData(salesInnData),
    [salesInnData],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">レポート</h2>
          <p className="text-sm text-muted-foreground">
            宿を選ぶと、稼働率・ADR・売上の週次を1画面で確認できます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedInnId || sortedInns[0]?.id || ""}
            onValueChange={setSelectedInnId}
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

      {!selectedInn ? (
        <p className="text-sm text-muted-foreground">
          宿が登録されていません。
        </p>
      ) : (
        <div className="space-y-6">
          {compareByYear ? (
            <div className="overflow-x-auto">
              <div
                className="flex flex-col gap-6"
                style={{ minWidth: 53 * 18 }}
              >
                <div className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {selectedInn.name} の週次稼働率（年比較）
                  </h3>
                  <WeeklyOccupancyYearCompareChart
                    data={occupancyYearData}
                    innName={selectedInn.name}
                  />
                </div>
                <div className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {selectedInn.name} の週次ADR（年比較）
                  </h3>
                  <WeeklyAdrYearCompareChart
                    data={adrYearData}
                    innName={selectedInn.name}
                  />
                </div>
                <div className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {selectedInn.name} の週次売上（年比較）
                  </h3>
                  <WeeklySalesYearCompareChart
                    data={salesYearData}
                    innName={selectedInn.name}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="flex flex-col gap-6"
                style={{ minWidth: chartMinWidth }}
              >
                <div className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {selectedInn.name} の週次稼働率（分子=泊数, 分母=7日）
                  </h3>
                  <WeeklyOccupancyChart
                    data={occupancyInnData}
                    weeks={dashboardWeeks}
                  />
                </div>
                <div className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {selectedInn.name} の週次ADR（1泊あたりの単価）
                  </h3>
                  <WeeklyAdrChart data={adrInnData} weeks={dashboardWeeks} />
                </div>
                <div className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {selectedInn.name} の週次売上（販売金額合計）
                  </h3>
                  <WeeklySalesChart
                    data={salesInnData}
                    weeks={dashboardWeeks}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
