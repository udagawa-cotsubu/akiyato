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

const YEARS = ["2024", "2025", "2026"] as const;
const YEAR_COLORS: Record<string, string> = {
  "2024": "#2563eb",
  "2025": "#16a34a",
  "2026": "#f97316",
};

/** その年のその週の開始日が今日以降なら true（未来＝透明度上げる） */
function isFutureWeekForYear(year: number, week: number): boolean {
  const weekStart = new Date(year, 0, 1 + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return weekStart.getTime() >= today.getTime();
}

/** 16進色に透明度（約40%）を付与 */
function withOpacity(hex: string, alpha = 0.4): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

/** ツールチップ用: ◯W の横に今年のその週の日付範囲を表示（例: 1W 2026年1/1~1/7） */
function formatWeekLabelWithDateRange(weekLabel: string): string {
  const match = /^(\d+)W$/.exec(weekLabel);
  if (!match) return weekLabel;
  const weekNum = parseInt(match[1], 10);
  const refYear = new Date().getFullYear();
  const start = new Date(refYear, 0, 1 + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${weekLabel} ${refYear}年${fmt(start)}~${fmt(end)}`;
}

export interface YearCompareRow {
  weekLabel: string;
  "2024": number;
  "2025": number;
  "2026": number;
}

/** 1宿分の週次稼働率から年比較用の行データを生成（1W〜53W、2024/2025/2026を横並び） */
export function buildOccupancyYearCompareData(
  innData: WeeklyOccupancyPoint[]
): YearCompareRow[] {
  const map = new Map<string, number>();
  innData.forEach((p) => {
    const match = /^([0-9]{4})\s+([0-9]+)W$/.exec(p.weekKey);
    if (!match) return;
    const [, year, week] = match;
    map.set(`${year}_${week}`, Math.round(p.occupancy * 100));
  });
  const rows: YearCompareRow[] = [];
  for (let w = 1; w <= 53; w += 1) {
    rows.push({
      weekLabel: `${w}W`,
      "2024": map.get(`2024_${w}`) ?? 0,
      "2025": map.get(`2025_${w}`) ?? 0,
      "2026": map.get(`2026_${w}`) ?? 0,
    });
  }
  return rows;
}

interface WeeklyOccupancyYearCompareChartProps {
  data: YearCompareRow[];
  innName: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}

function YearCompareTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-muted-foreground">
        {label ? formatWeekLabelWithDateRange(label) : label}
      </div>
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey}年: {p.value}%
          </div>
        ))}
      </div>
    </div>
  );
}

/** 1Wを左に固定し、1年分（1W〜53W）の領域で2024/2025/2026を横並びで比較する棒グラフ */
export function WeeklyOccupancyYearCompareChart({
  data,
  innName,
}: WeeklyOccupancyYearCompareChartProps) {
  return (
    <div className="min-w-0" style={{ minWidth: 53 * 18 }}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 2, right: 4, bottom: 16, left: 16 }}
          barCategoryGap="8%"
          barGap={1}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="weekLabel"
            angle={-45}
            textAnchor="end"
            height={28}
            tick={{ fontSize: 10 }}
          />
          <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} width={28} tick={{ fontSize: 10 }} />
          <Tooltip content={<YearCompareTooltip />} />
          <Legend />
          {YEARS.map((year) => {
            const color = YEAR_COLORS[year];
            return (
              <Bar
                key={year}
                dataKey={year}
                name={`${year}年`}
                fill={color}
                stroke={color}
                radius={[2, 2, 0, 0]}
              >
                {data.map((entry, i) => {
                  const weekNum = i + 1;
                  const isFuture = isFutureWeekForYear(Number(year), weekNum);
                  const fillColor = isFuture ? withOpacity(color) : color;
                  const strokeColor = isFuture ? withOpacity(color) : color;
                  return (
                    <Cell
                      key={i}
                      fill={fillColor}
                      stroke={strokeColor}
                    />
                  );
                })}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
