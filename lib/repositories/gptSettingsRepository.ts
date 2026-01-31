import type { GptSettings } from "@/lib/types/gptSettings";

const STORAGE_KEY = "app:gptSettings";

export async function get(): Promise<GptSettings | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GptSettings;
  } catch {
    return null;
  }
}

export async function save(settings: GptSettings): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
