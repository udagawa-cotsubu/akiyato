"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createInn } from "@/lib/lodging/repository";
import { toast } from "sonner";

export default function InnCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ tag: string; name: string; address: string; mapUrl: string }>({
    tag: "",
    name: "",
    address: "",
    mapUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("本来の名前を入力してください");
      return;
    }
    setSaving(true);
    try {
      await createInn({
        id: "", // createInn 側で上書きされる
        name: form.name.trim(),
        tag: form.tag.trim() || null,
        address: form.address.trim() || null,
        mapUrl: form.mapUrl.trim() || null,
        displayName: null,
      });
      toast.success("宿を追加しました");
      router.push("/admin/inns");
    } catch (error) {
      console.error(error);
      toast.error("宿の追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const csvPreview =
    (form.tag.trim() ? `${form.tag.trim()}.${form.name.trim() || "宿名"}` : form.name.trim() || "") || "";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">宿を追加</h2>
        <p className="text-sm text-muted-foreground">
          宿コードと本来の名前を入力すると、CSV 連携用文字列（コード.本来の名前）が自動生成されます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規登録</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">コード（例: 001）</label>
                <Input
                  value={form.tag}
                  onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value }))}
                  placeholder="001"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">本来の名前</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Sea Side 椿"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">住所</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="例: 東京都千代田区丸の内1-1-1"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Google Map URL</label>
              <Input
                value={form.mapUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, mapUrl: e.target.value }))}
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                CSV 連携用文字列（自動生成・参考表示）
              </label>
              <Input value={csvPreview} readOnly className="bg-muted" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/inns")}>
                キャンセル
              </Button>
              <Button type="submit" disabled={saving}>
                追加
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

