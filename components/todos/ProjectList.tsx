"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/lib/types/todos";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onAddProject,
  onEditProject,
  onDeleteProject,
}: ProjectListProps) {
  return (
    <>
      {/* Mobile: 横スクロールのチップ */}
      <div className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto py-1 md:hidden">
        <button
          type="button"
          onClick={() => onSelectProject(null)}
          className={`touch-manipulation shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
            selectedProjectId === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          すべてのTODO
        </button>
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted pr-0.5"
          >
            <button
              type="button"
              className={`touch-manipulation rounded-l-full px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedProjectId === p.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/80"
              }`}
              onClick={() => onSelectProject(p.id)}
            >
              <span className="max-w-[120px] truncate">{p.name}</span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 touch-manipulation rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onEditProject(p);
              }}
              aria-label="編集"
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 touch-manipulation rounded-full text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`「${p.name}」を削除しますか？`)) {
                  onDeleteProject(p);
                }
              }}
              aria-label="削除"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 touch-manipulation rounded-full"
          onClick={onAddProject}
          aria-label="プロジェクトを追加"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {/* Desktop: サイドバーカード */}
      <Card className="hidden w-56 shrink-0 md:block">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">プロジェクト</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onAddProject}
              aria-label="プロジェクトを追加"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectProject(null)}
            className={`w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors ${
              selectedProjectId === null
                ? "bg-muted font-medium"
                : "hover:bg-muted/70"
            }`}
          >
            すべてのTODO
          </button>
          {projects.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center justify-between gap-1 rounded-md px-3 py-2 ${
                selectedProjectId === p.id ? "bg-muted font-medium" : "hover:bg-muted/70"
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer text-left text-sm"
                onClick={() => onSelectProject(p.id)}
              >
                <span className="truncate">{p.name}</span>
              </button>
              <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(p);
                  }}
                  aria-label="編集"
                >
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`「${p.name}」を削除しますか？`)) {
                      onDeleteProject(p);
                    }
                  }}
                  aria-label="削除"
                >
                  <Trash2Icon className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
