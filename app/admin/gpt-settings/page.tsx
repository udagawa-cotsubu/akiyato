"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { GptSettings } from "@/lib/types/gptSettings";
import { get, save } from "@/lib/repositories/gptSettingsRepository";
import { z } from "zod";

const gptSettingsSchema = z.object({
  api_key: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  prompt_name: z.string(),
  prompt_version: z.string(),
  prompt_content: z.string(),
  endpoint_type: z.enum(["OPENAI", "AZURE_OPENAI", "OTHER"]),
  endpoint_url: z.string().optional(),
});

type GptSettingsForm = z.infer<typeof gptSettingsSchema>;

const defaultValues: GptSettingsForm = {
  api_key: "",
  model: "gpt-4o-mini",
  temperature: 0.3,
  prompt_name: "",
  prompt_version: "v1",
  prompt_content: "",
  endpoint_type: "OPENAI",
  endpoint_url: "",
};

export default function GptSettingsPage() {
  const [loading, setLoading] = useState(true);
  const form = useForm<GptSettingsForm>({
    resolver: zodResolver(gptSettingsSchema),
    defaultValues,
  });

  useEffect(() => {
    let cancelled = false;
    get().then((settings) => {
      if (cancelled) return;
      if (settings) {
        form.reset({
          api_key: settings.api_key,
          model: settings.model,
          temperature: settings.temperature,
          prompt_name: settings.prompt_name,
          prompt_version: settings.prompt_version,
          prompt_content: settings.prompt_content,
          endpoint_type: settings.endpoint_type,
          endpoint_url: settings.endpoint_url ?? "",
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [form]);

  const onSubmit = async (values: GptSettingsForm) => {
    const settings: GptSettings = {
      ...values,
      endpoint_url: values.endpoint_url || undefined,
    };
    await save(settings);
    toast.success("保存しました");
  };

  if (loading) {
    return (
      <div className="text-muted-foreground">読み込み中…</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">GPT接続情報管理</h2>
        <p className="text-muted-foreground text-sm">
          判定時に参照するプロンプト・モデル設定を編集します。
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="text-base">注意</CardTitle>
          <CardDescription>
            これはモック保存です。本番ではAPIキー等を環境変数とサーバー側で安全に管理する必要があります。クライアントに保存しないでください。
          </CardDescription>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">接続設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>APIキー（マスク表示）</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} placeholder="sk-..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpoint_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>エンドポイント種別</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPENAI">OpenAI</SelectItem>
                        <SelectItem value="AZURE_OPENAI">Azure OpenAI</SelectItem>
                        <SelectItem value="OTHER">その他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpoint_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>エンドポイントURL（任意・OPENAIは空で可）</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>モデル</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="gpt-4o-mini" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature（0〜1）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        max={1}
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">プロンプト</CardTitle>
              <CardDescription>
                判定時に使用するプロンプト名称・本文
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="prompt_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>プロンプト名称</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="買取再販判定" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prompt_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>バージョン</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="v1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prompt_content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>プロンプト本文</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="物件情報を元に買取再販の可否を判定してください..."
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit">保存</Button>
        </form>
      </Form>
    </div>
  );
}
