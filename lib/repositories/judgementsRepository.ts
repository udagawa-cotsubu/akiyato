import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { JudgementRecord } from "@/lib/types/judgement";

const TABLE = "judgements";

function toRecord(row: {
  id: string;
  created_at: string;
  input: JudgementRecord["input"];
  output: JudgementRecord["output"];
  prompt_snapshot: JudgementRecord["prompt_snapshot"];
  status: JudgementRecord["status"];
  error_message?: string | null;
  area_profile?: JudgementRecord["area_profile"];
  price_feedback?: JudgementRecord["price_feedback"];
}): JudgementRecord {
  return {
    id: row.id,
    created_at: row.created_at,
    input: row.input,
    output: row.output,
    prompt_snapshot: row.prompt_snapshot,
    status: row.status,
    error_message: row.error_message ?? undefined,
    area_profile: row.area_profile ?? undefined,
    price_feedback: row.price_feedback ?? undefined,
  };
}

export async function list(): Promise<JudgementRecord[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`判定一覧の取得に失敗しました: ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function getById(id: string): Promise<JudgementRecord | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`判定の取得に失敗しました: ${error.message}`);
  return data ? toRecord(data) : null;
}

export async function create(
  record: Omit<JudgementRecord, "id" | "created_at">
): Promise<JudgementRecord> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      input: record.input,
      output: record.output,
      prompt_snapshot: record.prompt_snapshot,
      status: record.status,
      error_message: record.error_message ?? null,
      area_profile: record.area_profile ?? null,
      price_feedback: record.price_feedback ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`判定の保存に失敗しました: ${error.message}`);
  return toRecord(data);
}

export async function deleteRecord(id: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(`判定の削除に失敗しました: ${error.message}`);
}
