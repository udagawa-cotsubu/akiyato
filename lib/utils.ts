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
