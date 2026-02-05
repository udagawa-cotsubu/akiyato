"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLodgingAuth } from "@/lib/lodging/useLodgingAuth";
import { fetchInns, fetchReservations } from "@/lib/lodging/repository";
import type { Inn, Reservation } from "@/lib/types/lodging";
import { buildStayNights, buildWeeklyOccupancy, getDashboardWeekRange } from "@/lib/lodging/metrics";
import { WeeklyOccupancyChart } from "@/components/lodging/WeeklyOccupancyChart";
import {
  WeeklyOccupancyYearCompareChart,
  buildOccupancyYearCompareData,
} from "@/components/lodging/WeeklyOccupancyYearCompareChart";
import { Switch } from "@/components/ui/switch";

export default function LodgingOccupancyPage() {
  const router = useRouter();
  const { authenticated, requireAuth } = useLodgingAuth();

  const [inns, setInns] = useState<Inn[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [compareByYear, setCompareByYear] = useState(true);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (authenticated === false) {
      router.replace("/admin/lodging/login");
    }
  }, [authenticated, router]);

  useEffect(() => {
    if (!authenticated) return;
    void (async () => {
      const [innList, reservationList] = await Promise.all([fetchInns(), fetchReservations()]);
      setInns(innList);
      setReservations(reservationList);
    })();
  }, [authenticated]);

  const dashboardWeeks = useMemo(() => getDashboardWeekRange(), []);
  const chartMinWidth = dashboardWeeks.length * 22;

  const weeklyOccupancy = useMemo(() => {
    if (!reservations.length || !authenticated) return [];
    const stayNights = buildStayNights(reservations);
    return buildWeeklyOccupancy(stayNights);
  }, [reservations, authenticated]);

  const sortedInns = useMemo(
    () => [...inns].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [inns],
  );

  if (!authenticated) {
    return <div className="text-muted-foreground">読み込み中…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">稼働率</h2>
        <p className="text-sm text-muted-foreground">
          宿ごとの週次稼働率（泊数÷7日）を表示します。
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
