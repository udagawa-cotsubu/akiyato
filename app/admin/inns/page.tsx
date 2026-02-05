"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createInn, deleteInn, fetchInns, updateInn } from "@/lib/lodging/repository";
import type { Inn } from "@/lib/types/lodging";
import { toast } from "sonner";

export default function InnsAdminPage() {
  const [inns, setInns] = useState<Inn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingInn, setEditingInn] = useState<Inn | null>(null);
  const [form, setForm] = useState<{ name: string; tag: string }>({
    name: "",
    tag: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetchInns()
      .then((data) => {
        if (!cancelled) setInns(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedInns = [...inns].sort((a, b) => {
    const keyA = a.displayName ?? (a.tag ? `${a.tag}.${a.name}` : a.name);
    const keyB = b.displayName ?? (b.tag ? `${b.tag}.${b.name}` : b.name);
    return keyA.localeCompare(keyB, "ja");
  });

  const resetForm = () => {
    setEditingInn(null);
    setForm({ name: "", tag: "" });
  };

  const handleEdit = (inn: Inn) => {
    setEditingInn(inn);
    setForm({
      name: inn.name,
      tag: inn.tag ?? "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("本来の名前を入力してください");
      return;
    }
    setSaving(true);
    try {
      if (editingInn) {
        const updated: Inn = {
          ...editingInn,
          name: form.name.trim(),
          tag: form.tag.trim() || null,
        };
        await updateInn(updated);
        setInns((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        toast.success("宿を更新しました");
      } else {
        const created = await createInn({
          name: form.name.trim(),
          tag: form.tag.trim() || null,
        });
        setInns((prev) => [...prev, created]);
        toast.success("宿を追加しました");
      }
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("宿の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inn: Inn) => {
    if (!window.confirm(`「${inn.name}」を削除しますか？ 予約データとの紐付けも失われる可能性があります。`)) {
      return;
    }
    try {
      await deleteInn(inn.id);
      setInns((prev) => prev.filter((i) => i.id !== inn.id));
      if (editingInn?.id === inn.id) {
        resetForm();
      }
      toast.success("宿を削除しました");
    } catch (error) {
      console.error(error);
      toast.error("宿の削除に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">宿管理</h2>
        <p className="text-sm text-muted-foreground">
          Supabase に登録されている宿一覧を管理します。CSV 連携用文字列は「コード.本来の名前」から自動生成されます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingInn ? "宿を編集" : "宿を追加"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 md:items-end" onSubmit={handleSubmit}>
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
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">
                CSV 連携用文字列（自動生成・参考表示）
              </label>
              <Input
                value={
                  (form.tag.trim()
                    ? `${form.tag.trim()}.${form.name.trim() || "宿名"}`
                    : form.name.trim() || "") || ""
                }
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="flex gap-2 md:justify-end md:col-span-3">
              {editingInn && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  新規追加モードに戻る
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {editingInn ? "保存" : "追加"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">宿一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">読み込み中…</p>
          ) : inns.length === 0 ? (
            <p className="text-muted-foreground">対象の宿はございません。</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">コード</TableHead>
                    <TableHead>本来の名前</TableHead>
                    <TableHead>CSV 連携用文字列</TableHead>
                    <TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInns.map((inn) => (
                    <TableRow key={inn.id}>
                      <TableCell className="font-mono text-sm">{inn.tag ?? "-"}</TableCell>
                      <TableCell className="font-medium">{inn.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {inn.displayName ?? (inn.tag ? `${inn.tag}.${inn.name}` : inn.name)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(inn)}
                          >
                            編集
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(inn)}
                          >
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
