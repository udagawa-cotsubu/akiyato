/**
 * GPT接続情報（管理画面で編集・保存、判定時に参照）
 * APIキーは .env.local の OPENAI_API_KEY を使用。エンドポイントは常に OpenAI。
 */

export interface GptSettings {
  temperature: number;
  prompt_name: string;
  prompt_version: string;
  prompt_content: string;
}

/** 判定で使用する OpenAI モデル（常に最新のものを指定） */
export const OPENAI_LATEST_MODEL = "gpt-4o-mini";
