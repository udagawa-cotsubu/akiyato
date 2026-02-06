/**
 * TODO管理用の定数（担当者モック10人）
 * ステータス一覧は @/lib/types/todos の TODO_STATUSES を参照
 */

import type { Assignee } from "@/lib/types/todos";

/** 担当者モック（10人） */
export const MOCK_ASSIGNEES: Assignee[] = [
  { id: "assignee-1", name: "山田 太郎" },
  { id: "assignee-2", name: "佐藤 花子" },
  { id: "assignee-3", name: "鈴木 一郎" },
  { id: "assignee-4", name: "田村 美咲" },
  { id: "assignee-5", name: "高橋 健太" },
  { id: "assignee-6", name: "伊藤 さくら" },
  { id: "assignee-7", name: "渡辺 大輔" },
  { id: "assignee-8", name: "中村 優子" },
  { id: "assignee-9", name: "小林 翔太" },
  { id: "assignee-10", name: "加藤 あゆみ" },
];
