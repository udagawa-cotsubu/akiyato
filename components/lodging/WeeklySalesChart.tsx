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

import type { WeeklySalesPoint } from "@/lib/lodging/metrics";

interface WeeklySalesChartProps {
  data: WeeklySalesPoint[];
  weeks: string[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value?: number; payload?: Record<string, unknown> }[];
  label?: string;
}

function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 縦軸用: 大きな数は万円表記で短く（例: 500000 → ¥50万、123456 → ¥12.3万） */
function formatYenAxis(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "¥0";
  if (n >= 10000) return `¥${Math.round(n / 1000) / 10}万`;
  return `¥${n.toLocaleString("ja-JP")}`;
}

function WeeklySalesTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const innId = p.dataKey as string;
  const innName = (p.payload?.[`${innId}_label`] as string | undefined) ?? "宿";
  const totalSale = p.value as number;
  const range = p.payload?.weekRange as string | undefined;

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">{innName}</div>
      <div className="text-muted-foreground">
        {label}
        {range ? ` (${range})` : ""}
      </div>
      <div className="mt-1">販売金額合計: {formatYen(totalSale)}</div>
    </div>
  );
}

/** 週キーの週開始日が今日以降なら true（未来の週＝オレンジ表示）。dateToWeekKey と同じ週開始日計算 */
function isFutureWeek(weekKey: string): boolean {
  const match = /^([0-9]{4})\s+([0-9]+)W$/.exec(weekKey);
  if (!match) return false;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan1 = new Date(year, 0, 1);
  jan1.setHours(0, 0, 0, 0);
  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return weekStart.getTime() >= today.getTime();
}

const FUTURE_BAR_COLOR = "#f97316";

/** 宿毎の週次売上（販売金額合計）を表示する棒グラフチャート */
export function WeeklySalesChart({ data, weeks }: WeeklySalesChartProps) {
  const innIds = Array.from(new Set(data.map((d) => d.innId)));
  const innNameById = new Map<string, string>();
  data.forEach((d) => {
    if (d.innId && d.innName) {
      innNameById.set(d.innId, d.innName);
    }
  });
  const chartData = weeks.map((weekKey) => {
    const row: Record<string, unknown> = { weekKey };

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
        row[innId] = Math.round(point.totalSaleAmount);
        row[`${innId}_label`] = point.innName ?? "宿";
      } else {
        row[innId] = 0;
        row[`${innId}_label`] = innNameById.get(innId) ?? "宿";
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
        {chartData.map((entry, i) => {
          const isFuture = isFutureWeek(entry.weekKey as string);
          return (
            <Cell
              key={i}
              fill={isFuture ? FUTURE_BAR_COLOR : stroke}
              stroke={isFuture ? FUTURE_BAR_COLOR : stroke}
              fillOpacity={1}
            />
          );
        })}
      </Bar>
    );
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 2, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="weekKey" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => formatYenAxis(Number(v))} width={30} tick={{ fontSize: 11 }} />
        <Tooltip content={<WeeklySalesTooltip />} />
        <Legend />
        {bars}
      </BarChart>
    </ResponsiveContainer>
  );
}
