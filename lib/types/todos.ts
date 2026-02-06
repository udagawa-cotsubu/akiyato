/**
 * TODO管理用の型定義
 */

export const TODO_STATUSES = ["未着手", "対応中", "対応完了"] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  createdAt: string; // ISO date string
}

/** 1タスクに対するサブタスク（チェックで完了管理） */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  projectId: string | null; // null = プロジェクト未紐付け
  title: string;
  assigneeId: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  status: TodoStatus;
  memo: string;
  /** サブタスク（複数可、チェックで完了管理） */
  subtasks?: Subtask[];
}

export interface Assignee {
  id: string;
  name: string;
}
