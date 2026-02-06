/**
 * TODO管理用のブラウザ内ローカルDB（IndexedDB ラッパー）
 *
 * - DB 名: todoDashboard
 * - オブジェクトストア: projects, todos
 */

import type { Project, Todo } from "@/lib/types/todos";

const DB_NAME = "todoDashboard";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";
const STORE_TODOS = "todos";

type StoreName = typeof STORE_PROJECTS | typeof STORE_TODOS;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_TODOS)) {
        const todosStore = db.createObjectStore(STORE_TODOS, { keyPath: "id" });
        todosStore.createIndex("projectId", "projectId", { unique: false });
        todosStore.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/** プロジェクト一覧を全件取得 */
export async function getAllProjects(): Promise<Project[]> {
  const db = await openDatabase();
  return new Promise<Project[]>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Project[]);
    request.onerror = () => reject(request.error ?? new Error("Failed to get projects"));
  });
}

/** プロジェクトを1件取得 */
export async function getProject(id: string): Promise<Project | undefined> {
  const db = await openDatabase();
  return new Promise<Project | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as Project | undefined);
    request.onerror = () => reject(request.error ?? new Error("Failed to get project"));
  });
}

/** プロジェクトを保存（作成・更新） */
export async function putProject(project: Project): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    store.put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to put project"));
  });
}

/** プロジェクトを削除 */
export async function deleteProject(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete project"));
  });
}

/** TODO一覧を全件取得 */
export async function getAllTodos(): Promise<Todo[]> {
  const db = await openDatabase();
  return new Promise<Todo[]>((resolve, reject) => {
    const tx = db.transaction(STORE_TODOS, "readonly");
    const store = tx.objectStore(STORE_TODOS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Todo[]);
    request.onerror = () => reject(request.error ?? new Error("Failed to get todos"));
  });
}

/** プロジェクトIDでTODO一覧を取得（projectId が null のものも index で取るには getAll してフィルタが簡単） */
export async function getTodosByProjectId(projectId: string | null): Promise<Todo[]> {
  const all = await getAllTodos();
  return all.filter((t) => t.projectId === projectId);
}

/** TODOを1件取得 */
export async function getTodo(id: string): Promise<Todo | undefined> {
  const db = await openDatabase();
  return new Promise<Todo | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_TODOS, "readonly");
    const store = tx.objectStore(STORE_TODOS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as Todo | undefined);
    request.onerror = () => reject(request.error ?? new Error("Failed to get todo"));
  });
}

/** TODOを保存（作成・更新） */
export async function putTodo(todo: Todo): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TODOS, "readwrite");
    const store = tx.objectStore(STORE_TODOS);
    store.put(todo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to put todo"));
  });
}

/** TODOを削除 */
export async function deleteTodo(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TODOS, "readwrite");
    const store = tx.objectStore(STORE_TODOS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete todo"));
  });
}
