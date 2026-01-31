import type { GptSettings } from "@/lib/types/gptSettings";
import { defaultPromptSettings } from "@/lib/prompt/defaultPrompt";

/**
 * プロンプト設定は lib/prompt/defaultPrompt.ts（または content/prompt.md）を単一ソースとして使用。
 * 管理画面では編集しない。将来はDBから取得する想定。
 */
export async function get(): Promise<GptSettings> {
  return defaultPromptSettings;
}

/** 現在はファイル単一ソースのため未使用。将来DB化時に保存処理を実装する。 */
export async function save(_settings: GptSettings): Promise<void> {
  // no-op: 設定はコード側の defaultPrompt のみ
}
