import type { JudgementRecord } from "@/lib/types/judgement";

const STORAGE_KEY = "app:judgements";

function getStored(): JudgementRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JudgementRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(records: JudgementRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function list(): Promise<JudgementRecord[]> {
  const records = getStored();
  return [...records].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getById(id: string): Promise<JudgementRecord | null> {
  const records = getStored();
  return records.find((r) => r.id === id) ?? null;
}

export async function create(
  record: Omit<JudgementRecord, "id" | "created_at">
): Promise<JudgementRecord> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const full: JudgementRecord = { ...record, id, created_at };
  const records = getStored();
  records.unshift(full);
  setStored(records);
  return full;
}

export async function deleteRecord(id: string): Promise<void> {
  const records = getStored().filter((r) => r.id !== id);
  setStored(records);
}
