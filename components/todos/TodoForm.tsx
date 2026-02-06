"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TODO_STATUSES } from "@/lib/types/todos";
import type { Todo } from "@/lib/types/todos";
import { MOCK_ASSIGNEES } from "@/lib/todos/constants";
import type { Project } from "@/lib/types/todos";
import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react";

const subtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

const schema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  projectId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(["未着手", "対応中", "対応完了"]),
  memo: z.string(),
  subtasks: z.array(subtaskSchema),
});

type FormValues = z.infer<typeof schema>;

interface TodoFormProps {
  todo?: Todo | null;
  projects: Project[];
  defaultProjectId?: string | null;
  onSave: (values: FormValues) => void;
  onCancel: () => void;
  onDelete?: (todo: Todo) => void;
}

export function TodoForm({
  todo,
  projects,
  defaultProjectId,
  onSave,
  onCancel,
  onDelete,
}: TodoFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: todo?.title ?? "",
      projectId: todo?.projectId ?? defaultProjectId ?? null,
      assigneeId: todo?.assigneeId ?? null,
      startDate: todo?.startDate ?? null,
      endDate: todo?.endDate ?? null,
      status: todo?.status ?? "未着手",
      memo: todo?.memo ?? "",
      subtasks: todo?.subtasks ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });

  useEffect(() => {
    form.reset({
      title: todo?.title ?? "",
      projectId: todo?.projectId ?? defaultProjectId ?? null,
      assigneeId: todo?.assigneeId ?? null,
      startDate: todo?.startDate ?? null,
      endDate: todo?.endDate ?? null,
      status: todo?.status ?? "未着手",
      memo: todo?.memo ?? "",
      subtasks: todo?.subtasks ?? [],
    });
  }, [todo, defaultProjectId, form]);

  const handleBackdropClick = (e: React.MouseEvent | React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={handleBackdropClick}
        onPointerDown={handleBackdropClick}
      />
      <Card
        className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t sm:rounded-xl sm:border"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base sm:text-lg">
            {todo ? "TODOを編集" : "TODOを追加"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-[env(safe-area-inset-bottom)] sm:pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>タイトル</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="タスクのタイトル"
                        className="min-h-11 touch-manipulation"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>プロジェクト</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="min-h-11 touch-manipulation">
                          <SelectValue placeholder="未選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>担当者</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="min-h-11 touch-manipulation">
                          <SelectValue placeholder="未選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {MOCK_ASSIGNEES.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="min-h-11 touch-manipulation"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="min-h-11 touch-manipulation"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ステータス</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="min-h-11 touch-manipulation">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TODO_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メモ</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="メモ（任意）"
                        className="min-h-20 touch-manipulation"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>サブタスク</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="touch-manipulation"
                    onClick={() =>
                      append({
                        id: uuidv4(),
                        title: "",
                        completed: false,
                      })
                    }
                  >
                    <PlusIcon className="size-4" />
                    追加
                  </Button>
                </div>
                <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                  {fields.length === 0 ? (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      サブタスクがありません
                    </p>
                  ) : (
                    fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 rounded border bg-background p-2"
                      >
                        <FormField
                          control={form.control}
                          name={`subtasks.${index}.completed`}
                          render={({ field: checkboxField }) => (
                            <FormItem className="flex shrink-0 items-center space-y-0">
                              <FormControl>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={checkboxField.value}
                                  className="flex size-8 shrink-0 items-center justify-center rounded border border-input transition-colors hover:bg-muted/50"
                                  onClick={() =>
                                    checkboxField.onChange(!checkboxField.value)
                                  }
                                >
                                  {checkboxField.value ? (
                                    <CheckIcon className="size-4 text-primary" />
                                  ) : null}
                                </button>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`subtasks.${index}.title`}
                          render={({ field: titleField }) => (
                            <FormItem className="min-w-0 flex-1">
                              <FormControl>
                                <Input
                                  placeholder="サブタスクの内容"
                                  className="min-h-9 touch-manipulation border-0 bg-transparent shadow-none focus-visible:ring-0"
                                  {...titleField}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                          aria-label="削除"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {todo && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11 min-w-[80px] touch-manipulation"
                    onClick={() => {
                      if (window.confirm(`「${todo.title}」を削除しますか？`)) {
                        onDelete(todo);
                      }
                    }}
                  >
                    削除
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="min-h-11 min-w-[80px] touch-manipulation"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="min-h-11 min-w-[80px] touch-manipulation"
                >
                  {todo ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
