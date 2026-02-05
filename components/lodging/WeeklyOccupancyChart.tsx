"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WeeklyOccupancyPoint } from "@/lib/lodging/metrics";

interface WeeklyOccupancyChartProps {
  data: WeeklyOccupancyPoint[];
  weeks: string[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function WeeklyOccupancyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const innId = p.dataKey as string;
  const innName = (p.payload?.[`${innId}_label`] as string | undefined) ?? "宿";
  const percent = p.value as number;
  const stayedNights = p.payload?.[`${innId}_stayedNights`] as number | undefined;
  const range = p.payload?.weekRange as string | undefined;

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">{innName}</div>
      <div className="text-muted-foreground">
        {label}
        {range ? ` (${range})` : ""}
      </div>
      <div className="mt-1">
        {percent}%{stayedNights != null ? ` / ${stayedNights}泊` : ""}
      </div>
    </div>
  );
}

/** 週キーの週開始日が今日以降なら true（未来の週＝オレンジ表示） */
function isFutureWeek(weekKey: string): boolean {
  const match = /^([0-9]{4})\s+([0-9]+)W$/.exec(weekKey);
  if (!match) return false;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const weekStart = new Date(year, 0, 1 + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return weekStart.getTime() >= today.getTime();
}

const FUTURE_BAR_COLOR = "#f97316";

/** 宿毎の週次稼働率を表示する棒グラフチャート */
export function WeeklyOccupancyChart({ data, weeks }: WeeklyOccupancyChartProps) {
  // Recharts 用に、weekKey を横軸、innName ごとに系列に変換する
  const innIds = Array.from(new Set(data.map((d) => d.innId)));
  const innNameById = new Map<string, string>();
  data.forEach((d) => {
    if (d.innId && d.innName) {
      innNameById.set(d.innId, d.innName);
    }
  });
  const chartData = weeks.map((weekKey) => {
    const row: Record<string, unknown> = { weekKey };

    // 週キーから期間（MM/DD〜MM/DD）を計算して保持しておく
    const match = /^([0-9]{4})\s+([0-9]+)W$/.exec(weekKey);
    if (match) {
      const year = Number(match[1]);
      const week = Number(match[2]);
      const start = new Date(year, 0, 1 + (week - 1) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const fmtMd = (d: Date) =>
        `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
      row.weekRange = `${fmtMd(start)}〜${fmtMd(end)}`;
    }
    for (const innId of innIds) {
      const point = data.find((d) => d.weekKey === weekKey && d.innId === innId);
      if (point) {
        // パーセンテージ表記にしたいので 0〜100 に変換
        row[innId] = Math.round(point.occupancy * 100);
        row[`${innId}_label`] = point.innName ?? "宿";
        row[`${innId}_stayedNights`] = point.stayedNights;
      } else {
        // その週に宿泊がない宿も 0% として明示的に保持する
        row[innId] = 0;
        row[`${innId}_label`] = innNameById.get(innId) ?? "宿";
        row[`${innId}_stayedNights`] = 0;
      }
    }
    return row;
  });

  const bars = innIds.map((innId, index) => {
    const colorPalette = ["#2563eb", "#16a34a", "#0d9488", "#db2777", "#7c3aed", "#ca8a04"];
    const stroke = colorPalette[index % colorPalette.length];
    const name = innNameById.get(innId) ?? `宿${index + 1}`;
    return (
      <Bar
        key={innId}
        dataKey={innId}
        name={name}
        stroke={stroke}
        fill={stroke}
        radius={[2, 2, 0, 0]}
      >
        {chartData.map((entry, i) => (
          <Cell
            key={i}
            fill={isFutureWeek(entry.weekKey as string) ? FUTURE_BAR_COLOR : stroke}
            stroke={isFutureWeek(entry.weekKey as string) ? FUTURE_BAR_COLOR : stroke}
          />
        ))}
      </Bar>
    );
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="weekKey" />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip content={<WeeklyOccupancyTooltip />} />
        <Legend />
        {bars}
      </BarChart>
    </ResponsiveContainer>
  );
}

