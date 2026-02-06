"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Project } from "@/lib/types/todos";

const schema = z.object({
  name: z.string().min(1, "プロジェクト名を入力してください"),
});

type FormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  project?: Project | null;
  onSave: (values: FormValues) => void;
  onCancel: () => void;
}

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: project?.name ?? "" },
  });

  useEffect(() => {
    form.reset({ name: project?.name ?? "" });
  }, [project, form]);

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
        className="relative z-10 w-full max-h-[85dvh] max-w-md overflow-y-auto rounded-t-2xl border-t sm:rounded-xl sm:border"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base sm:text-lg">
            {project ? "プロジェクトを編集" : "プロジェクトを追加"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-[env(safe-area-inset-bottom)] sm:pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>プロジェクト名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: リニューアル企画"
                        className="min-h-11 touch-manipulation"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
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
                  {project ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
