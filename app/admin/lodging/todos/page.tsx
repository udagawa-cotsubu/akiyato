"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createProject,
  deleteProject as deleteProjectRepo,
  fetchProjects,
  fetchTodos,
  updateProject as updateProjectRepo,
  createTodo,
  updateTodo as updateTodoRepo,
  deleteTodo as deleteTodoRepo,
} from "@/lib/todos/repository";
import type { Project, Todo } from "@/lib/types/todos";
import { toast } from "sonner";
import { ProjectForm } from "@/components/todos/ProjectForm";
import { ProjectList } from "@/components/todos/ProjectList";
import { TimelineView } from "@/components/todos/TimelineView";
import { TodoForm } from "@/components/todos/TodoForm";
import { PlusIcon } from "lucide-react";

export default function TodosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<Project | null | "new">(null);
  const [todoForm, setTodoForm] = useState<Todo | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([fetchProjects(), fetchTodos()]);
      setProjects(p);
      setTodos(t);
    } catch (e) {
      console.error(e);
      toast.error("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTodos = useMemo(() => {
    if (selectedProjectId === null) return todos;
    return todos.filter((t) => t.projectId === selectedProjectId);
  }, [todos, selectedProjectId]);

  const projectNamesById = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const handleSaveProject = useCallback(
    async (values: { name: string }) => {
      try {
        if (projectForm && projectForm !== "new") {
          await updateProjectRepo({ ...projectForm, name: values.name });
          setProjects((prev) =>
            prev.map((p) =>
              p.id === projectForm.id ? { ...p, name: values.name } : p,
            ),
          );
          toast.success("プロジェクトを更新しました");
        } else {
          const created = await createProject({ name: values.name });
          setProjects((prev) => [...prev, created]);
          toast.success("プロジェクトを作成しました");
        }
        setProjectForm(null);
      } catch (e) {
        console.error(e);
        toast.error("保存に失敗しました");
      }
    },
    [projectForm],
  );

  const handleDeleteProject = useCallback(async (project: Project) => {
    try {
      await deleteProjectRepo(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (selectedProjectId === project.id) setSelectedProjectId(null);
      toast.success("プロジェクトを削除しました");
    } catch (e) {
      console.error(e);
      toast.error("削除に失敗しました");
    }
  }, [selectedProjectId]);

  const handleSaveTodo = useCallback(
    async (values: {
      title: string;
      projectId: string | null;
      assigneeId: string | null;
      startDate: string | null;
      endDate: string | null;
      status: Todo["status"];
      memo: string;
      subtasks?: Todo["subtasks"];
    }) => {
      const normalized = {
        ...values,
        projectId: values.projectId || null,
        assigneeId: values.assigneeId || null,
        startDate: values.startDate?.trim() || null,
        endDate: values.endDate?.trim() || null,
        subtasks: values.subtasks ?? [],
      };
      try {
        if (todoForm && todoForm !== "new") {
          await updateTodoRepo({
            ...todoForm,
            ...normalized,
          });
          setTodos((prev) =>
            prev.map((t) =>
              t.id === todoForm.id ? { ...t, ...normalized } : t,
            ),
          );
          toast.success("TODOを更新しました");
        } else {
          const created = await createTodo(normalized);
          setTodos((prev) => [...prev, created]);
          toast.success("TODOを作成しました");
        }
        setTodoForm(null);
      } catch (e) {
        console.error(e);
        toast.error("保存に失敗しました");
      }
    },
    [todoForm],
  );

  const handleDeleteTodo = useCallback(async (todo: Todo) => {
    if (!window.confirm(`「${todo.title}」を削除しますか？`)) return;
    try {
      await deleteTodoRepo(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      toast.success("TODOを削除しました");
    } catch (e) {
      console.error(e);
      toast.error("削除に失敗しました");
    }
  }, []);

  const handleTodoDatesChange = useCallback(
    async (todo: Todo, startDate: string | null, endDate: string | null) => {
      try {
        await updateTodoRepo({ ...todo, startDate, endDate });
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todo.id ? { ...t, startDate, endDate } : t,
          ),
        );
      } catch (e) {
        console.error(e);
        toast.error("期間の更新に失敗しました");
      }
    },
    [],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 md:gap-4 md:h-[calc(100vh-8rem)]">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold md:text-xl">TODO管理</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            プロジェクト別にTODOを管理し、タイムラインで表示できます。
          </p>
        </div>
        <Button
          onClick={() => setTodoForm("new")}
          className="w-full min-h-11 touch-manipulation sm:w-auto"
        >
          <PlusIcon className="size-4" />
          TODOを追加
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
        <ProjectList
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onAddProject={() => setProjectForm("new")}
          onEditProject={(p) => setProjectForm(p)}
          onDeleteProject={handleDeleteProject}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {loading ? (
            <p className="text-muted-foreground">読み込み中…</p>
          ) : (
            <TimelineView
              todos={filteredTodos}
              projectNamesById={projectNamesById}
              onTodoClick={(todo) => setTodoForm(todo)}
              onTodoDatesChange={handleTodoDatesChange}
            />
          )}
        </div>
      </div>

      {projectForm !== null && (
        <ProjectForm
          project={projectForm === "new" ? null : projectForm}
          onSave={handleSaveProject}
          onCancel={() => setProjectForm(null)}
        />
      )}

      {todoForm !== null && (
        <TodoForm
          todo={todoForm === "new" ? null : todoForm}
          projects={projects}
          defaultProjectId={selectedProjectId}
          onSave={handleSaveTodo}
          onCancel={() => setTodoForm(null)}
          onDelete={
            todoForm !== "new"
              ? (todo) => {
                  void handleDeleteTodo(todo);
                  setTodoForm(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
