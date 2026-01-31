/**
 * GPT接続情報（管理画面で編集・保存、判定時に参照）
 */

export type EndpointType = "OPENAI" | "AZURE_OPENAI" | "OTHER";

export interface GptSettings {
  api_key: string;
  model: string;
  temperature: number;
  prompt_name: string;
  prompt_version: string;
  prompt_content: string;
  endpoint_type: EndpointType;
  endpoint_url?: string;
}
