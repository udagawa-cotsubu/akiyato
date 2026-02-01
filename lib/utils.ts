import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 入力文字列を半角数値のみに正規化（全角数字→半角、非数字は除去） */
export function normalizeHalfWidthDigits(value: string): string {
  return value
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/\D/g, "")
}

/** 築年から耐震区分を判定（1981年5月まで＝旧耐震、1981年6月1日以降＝新耐震。年のみのため1981は不明） */
export function getTaishinLabelFromBuiltYear(
  builtYear: number | undefined
): "新耐震" | "旧耐震" | "不明" {
  if (builtYear == null || builtYear <= 0) return "不明";
  if (builtYear < 1981) return "旧耐震";
  if (builtYear > 1981) return "新耐震";
  return "不明"; // 1981年は月が分からないため
}
