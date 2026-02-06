"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Todo } from "@/lib/types/todos";
import { MOCK_ASSIGNEES } from "@/lib/todos/constants";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 日付文字列に日数を加算 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** 2つの日付の差（日数、a - b） */
function getDayDiff(a: string, b: string): number {
  const t1 = new Date(a + "T00:00:00").getTime();
  const t2 = new Date(b + "T00:00:00").getTime();
  return Math.round((t1 - t2) / (24 * 60 * 60 * 1000));
}

interface TimelineViewProps {
  todos: Todo[];
  projectNamesById: Map<string, string>;
  onTodoClick: (todo: Todo) => void;
  onTodoDatesChange?: (todo: Todo, startDate: string | null, endDate: string | null) => void;
}

/** 配下のTODOの一番古い日付・一番新しい日付を算出し、十分に収まる範囲（前後に余白日数）を返す。プロジェクト絞り込み時も右端が切れないよう多めに取る */
const TIMELINE_PADDING_DAYS = 14;
/** 日付1列あたりの固定幅（px）。日付エリアの横幅を固定する */
const DAY_COLUMN_WIDTH_PX = 28;

function getDateRange(todos: Todo[]): { start: Date; end: Date } {
  const dates: number[] = [];
  for (const t of todos) {
    if (t.startDate) dates.push(new Date(t.startDate + "T00:00:00").getTime());
    if (t.endDate) dates.push(new Date(t.endDate + "T00:00:00").getTime());
  }
  if (dates.length === 0) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { start, end };
  }
  const minTs = Math.min(...dates);
  const maxTs = Math.max(...dates);
  const start = new Date(minTs);
  const end = new Date(maxTs);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - TIMELINE_PADDING_DAYS);
  end.setDate(end.getDate() + TIMELINE_PADDING_DAYS);
  return { start, end };
}

function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d <= e) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function TimelineView({
  todos,
  projectNamesById,
  onTodoClick,
  onTodoDatesChange,
}: TimelineViewProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const justMovedRef = useRef(false);
  const frozenRangeRef = useRef<{ start: Date; end: Date } | null>(null);
  const [dragState, setDragState] = useState<{
    todoId: string;
    kind: "start" | "end" | "move";
    tempStart: string | null;
    tempEnd: string | null;
    moveInitialClientX?: number;
    moveAnchorStart?: string | null;
    moveAnchorEnd?: string | null;
  } | null>(null);

  const rangeFromTodos = useMemo(() => getDateRange(todos), [todos]);
  const rangeRef = useRef(rangeFromTodos);
  rangeRef.current = rangeFromTodos;
  const rangeStart = dragState && frozenRangeRef.current
    ? frozenRangeRef.current.start
    : rangeFromTodos.start;
  const rangeEnd = dragState && frozenRangeRef.current
    ? frozenRangeRef.current.end
    : rangeFromTodos.end;
  const days = useMemo(
    () => getDaysBetween(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const rangeStartTs = rangeStart.getTime();
  const rangeEndTs = rangeEnd.getTime();
  const rangeSpan = rangeEndTs - rangeStartTs;

  const getLeftPercent = useCallback(
    (dateStr: string | null) => {
      if (!dateStr) return 0;
      const t = new Date(dateStr + "T00:00:00").getTime();
      return Math.max(0, ((t - rangeStartTs) / rangeSpan) * 100);
    },
    [rangeStartTs, rangeSpan],
  );

  const getWidthPercent = useCallback(
    (startStr: string | null, endStr: string | null) => {
      const start = startStr
        ? new Date(startStr + "T00:00:00").getTime()
        : rangeStartTs;
      const end = endStr
        ? new Date(endStr + "T00:00:00").getTime()
        : rangeEndTs;
      const width = ((end - start) / rangeSpan) * 100;
      const leftPct = startStr
        ? Math.max(0, ((start - rangeStartTs) / rangeSpan) * 100)
        : 0;
      const maxWidth = 100 - leftPct - 2;
      return Math.min(maxWidth, Math.max(2, width));
    },
    [rangeStartTs, rangeEndTs, rangeSpan],
  );

  const clientXToDate = useCallback(
    (clientX: number): string => {
      const el = trackRef.current;
      if (!el) return formatDate(rangeStart);
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ts = rangeStartTs + ratio * rangeSpan;
      return formatDate(new Date(ts));
    },
    [rangeStartTs, rangeSpan],
  );

  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent, todo: Todo, kind: "start" | "end") => {
      e.preventDefault();
      e.stopPropagation();
      if (!onTodoDatesChange) return;
      frozenRangeRef.current = {
        start: rangeRef.current.start,
        end: rangeRef.current.end,
      };
      setDragState({
        todoId: todo.id,
        kind,
        tempStart: todo.startDate,
        tempEnd: todo.endDate,
      });
    },
    [onTodoDatesChange],
  );

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent, todo: Todo) => {
      e.preventDefault();
      e.stopPropagation();
      if (!onTodoDatesChange) return;
      justMovedRef.current = false;
      frozenRangeRef.current = {
        start: rangeRef.current.start,
        end: rangeRef.current.end,
      };
      setDragState({
        todoId: todo.id,
        kind: "move",
        tempStart: todo.startDate,
        tempEnd: todo.endDate,
        moveInitialClientX: e.clientX,
        moveAnchorStart: todo.startDate,
        moveAnchorEnd: todo.endDate,
      });
    },
    [onTodoDatesChange],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const date = clientXToDate(e.clientX);
      setDragState((s) => {
        if (!s || !onTodoDatesChange) return s;
        if (s.kind === "start") {
          const end = s.tempEnd ?? s.tempStart ?? date;
          const start = date > end ? end : date;
          return { ...s, tempStart: start };
        }
        if (s.kind === "end") {
          const start = s.tempStart ?? s.tempEnd ?? date;
          const end = date < start ? start : date;
          return { ...s, tempEnd: end };
        }
        if (s.kind === "move" && s.moveInitialClientX != null) {
          const initialDate = clientXToDate(s.moveInitialClientX);
          const deltaDays = getDayDiff(date, initialDate);
          const anchorStart = s.moveAnchorStart ?? s.moveAnchorEnd ?? initialDate;
          const anchorEnd = s.moveAnchorEnd ?? s.moveAnchorStart ?? initialDate;
          return {
            ...s,
            tempStart: addDays(anchorStart, deltaDays),
            tempEnd: addDays(anchorEnd, deltaDays),
          };
        }
        return s;
      });
    },
    [onTodoDatesChange, clientXToDate],
  );

  const handleMouseUp = useCallback(() => {
    setDragState((s) => {
      if (!s || !onTodoDatesChange) {
        return null;
      }
      const todo = todos.find((t) => t.id === s.todoId);
      if (todo) {
        onTodoDatesChange(todo, s.tempStart, s.tempEnd);
        justMovedRef.current = true;
      }
      frozenRangeRef.current = null;
      return null;
    });
  }, [onTodoDatesChange, todos]);

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => handleMouseMove(e);
    const onUp = () => handleMouseUp();
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  const sortedTodos = useMemo(
    () =>
      [...todos].sort((a, b) => {
        const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aStart - bStart;
      }),
    [todos],
  );

  const taskColumnWidth = 200;
  const dateAreaWidthPx = days.length * DAY_COLUMN_WIDTH_PX;

  const handleOpenTodo = useCallback(
    (todo: Todo) => {
      if (justMovedRef.current) {
        justMovedRef.current = false;
        return;
      }
      onTodoClick(todo);
    },
    [onTodoClick],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div
        className="inline-block min-w-0"
        style={{ width: taskColumnWidth + dateAreaWidthPx }}
      >
        {/* Header: dates（縦横スクロール時のみ動く・ドラッグ中は固定） */}
        <div className="sticky top-0 z-10 flex border-b bg-background">
          <div
            className="shrink-0 border-r px-2 py-2 font-medium text-sm md:text-base"
            style={{ width: taskColumnWidth }}
          >
            タスク
          </div>
          <div
            className="flex shrink-0"
            style={{ width: dateAreaWidthPx }}
          >
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className="shrink-0 border-r px-0.5 py-1 text-center text-[10px] md:px-1 md:text-xs"
                style={{ width: DAY_COLUMN_WIDTH_PX }}
              >
                {d.getMonth() + 1}/{d.getDate()}
              </div>
            ))}
          </div>
        </div>
        {/* Rows: one per todo */}
        {sortedTodos.map((todo, rowIndex) => {
          const assignee = todo.assigneeId
            ? MOCK_ASSIGNEES.find((a) => a.id === todo.assigneeId)
            : null;
          const projectName = todo.projectId
            ? projectNamesById.get(todo.projectId)
            : null;
          const isDragging = dragState?.todoId === todo.id;
          const effectiveStart =
            isDragging && dragState.tempStart !== null
              ? dragState.tempStart
              : todo.startDate;
          const effectiveEnd =
            isDragging && dragState.tempEnd !== null
              ? dragState.tempEnd
              : todo.endDate;
          const left = getLeftPercent(
            effectiveStart ?? effectiveEnd ?? todo.startDate ?? todo.endDate,
          );
          const width = getWidthPercent(effectiveStart, effectiveEnd);
          const canResize = Boolean(onTodoDatesChange);
          return (
            <div key={todo.id} className="flex border-b last:border-b-0">
              <div
                className="shrink-0 cursor-pointer touch-manipulation border-r px-2 py-1.5 hover:bg-muted/50 md:py-2"
                style={{ width: taskColumnWidth }}
                onClick={() => handleOpenTodo(todo)}
              >
                <p className="truncate text-xs font-medium md:text-sm">{todo.title}</p>
                <p className="truncate text-[10px] text-muted-foreground md:text-xs">
                  {assignee?.name ?? "—"}
                  {projectName ? ` · ${projectName}` : ""}
                </p>
              </div>
              <div
                ref={rowIndex === 0 ? trackRef : undefined}
                className="relative flex min-h-[32px] shrink-0 cursor-pointer items-center md:min-h-[28px]"
                style={{ width: dateAreaWidthPx }}
                onClick={() => handleOpenTodo(todo)}
              >
                <div
                  className="absolute left-0 right-0 flex h-5 items-center md:h-4"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: "8px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {canResize && (
                    <div
                      className="h-full w-2 shrink-0 cursor-ew-resize rounded-l bg-primary touch-manipulation hover:bg-primary/90 md:w-1.5"
                      onMouseDown={(e) =>
                        handleHandleMouseDown(e, todo, "start")
                      }
                      role="slider"
                      aria-label="開始日を変更"
                    />
                  )}
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex h-full min-w-0 flex-1 items-center text-left text-xs text-primary-foreground transition-opacity touch-manipulation hover:bg-primary ${
                      canResize
                        ? "cursor-grab active:cursor-grabbing bg-primary/80"
                        : "cursor-pointer bg-primary/80"
                    }`}
                    onMouseDown={
                      canResize
                        ? (e) => handleBarMouseDown(e, todo)
                        : undefined
                    }
                    onClick={() => handleOpenTodo(todo)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenTodo(todo);
                      }
                    }}
                  >
                    <span className="ml-1 truncate">{todo.title}</span>
                  </div>
                  {canResize && (
                    <div
                      className="h-full w-2 shrink-0 cursor-ew-resize rounded-r bg-primary touch-manipulation hover:bg-primary/90 md:w-1.5"
                      onMouseDown={(e) =>
                        handleHandleMouseDown(e, todo, "end")
                      }
                      role="slider"
                      aria-label="終了日を変更"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
