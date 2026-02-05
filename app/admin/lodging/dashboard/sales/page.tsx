"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchInns, fetchReservations } from "@/lib/lodging/repository";
import type { Inn, Reservation } from "@/lib/types/lodging";
import { buildWeeklySales, getDashboardWeekRange } from "@/lib/lodging/metrics";
import { WeeklySalesChart } from "@/components/lodging/WeeklySalesChart";
import {
  WeeklySalesYearCompareChart,
  buildSalesYearCompareData,
} from "@/components/lodging/WeeklySalesYearCompareChart";
import { Switch } from "@/components/ui/switch";

export default function LodgingSalesPage() {
  const [inns, setInns] = useState<Inn[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [compareByYear, setCompareByYear] = useState(true);

  useEffect(() => {
    void (async () => {
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
    })();
  }, []);

  const dashboardWeeks = useMemo(() => getDashboardWeekRange(), []);
  const chartMinWidth = dashboardWeeks.length * 22;

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">売上</h2>
        <p className="text-sm text-muted-foreground">
          宿ごとの週次販売金額合計を表示します。
        </p>
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
              const innData = weeklySales.filter((p) => p.innId === inn.id);
              const yearCompareData = buildSalesYearCompareData(innData);
              return (
                <div key={inn.id} className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {inn.name} の週次売上（年比較）
                  </h3>
                  <WeeklySalesYearCompareChart
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
              const innData = weeklySales.filter((p) => p.innId === inn.id);
              return (
                <div key={inn.id} className="rounded-md border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {inn.name} の週次売上（販売金額合計）
                  </h3>
                  <WeeklySalesChart data={innData} weeks={dashboardWeeks} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
