/**
 * TODO管理用リポジトリ層（localDb を呼ぶ薄いラッパー）
 */

import { v4 as uuidv4 } from "uuid";
import type { Project, Todo } from "@/lib/types/todos";
import * as localDb from "./localDb";

/** プロジェクト一覧取得 */
export async function fetchProjects(): Promise<Project[]> {
  return localDb.getAllProjects();
}

/** プロジェクト作成 */
export async function createProject(input: Pick<Project, "name">): Promise<Project> {
  const project: Project = {
    id: uuidv4(),
    name: input.name,
    createdAt: new Date().toISOString(),
  };
  await localDb.putProject(project);
  return project;
}

/** プロジェクト更新 */
export async function updateProject(project: Project): Promise<void> {
  await localDb.putProject(project);
}

/** プロジェクト削除 */
export async function deleteProject(id: string): Promise<void> {
  await localDb.deleteProject(id);
}

/** TODO一覧取得 */
export async function fetchTodos(): Promise<Todo[]> {
  return localDb.getAllTodos();
}

/** TODO作成 */
export async function createTodo(
  input: Omit<Todo, "id"> & { id?: string },
): Promise<Todo> {
  const todo: Todo = {
    id: input.id ?? uuidv4(),
    projectId: input.projectId ?? null,
    title: input.title,
    assigneeId: input.assigneeId ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    status: input.status,
    memo: input.memo ?? "",
    subtasks: input.subtasks ?? [],
  };
  await localDb.putTodo(todo);
  return todo;
}

/** TODO更新 */
export async function updateTodo(todo: Todo): Promise<void> {
  await localDb.putTodo(todo);
}

/** TODO削除 */
export async function deleteTodo(id: string): Promise<void> {
  await localDb.deleteTodo(id);
}
