"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteInn, fetchInns } from "@/lib/lodging/repository";
import type { Inn } from "@/lib/types/lodging";
import { toast } from "sonner";

export default function InnsAdminPage() {
  const [inns, setInns] = useState<Inn[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (inn: Inn) => {
    if (!window.confirm(`「${inn.name}」を削除しますか？ 予約データとの紐付けも失われる可能性があります。`)) {
      return;
    }
    try {
      await deleteInn(inn.id);
      setInns((prev) => prev.filter((i) => i.id !== inn.id));
      toast.success("宿を削除しました");
    } catch (error) {
      console.error(error);
      toast.error("宿の削除に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">宿管理</h2>
          <p className="text-sm text-muted-foreground">
            Supabase に登録されている宿一覧です。CSV 連携用文字列は「コード.本来の名前」から自動生成されます。
          </p>
        </div>
        <Link href="/admin/inns/new">
          <Button>宿を追加</Button>
        </Link>
      </div>

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
                    <TableHead>住所</TableHead>
                    <TableHead>Google Map</TableHead>
                    <TableHead className="w-40">操作</TableHead>
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
                      <TableCell className="text-xs">
                        {inn.address ?? <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {inn.mapUrl ? (
                          <a
                            href={inn.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            開く
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/admin/inns/${inn.id}`}>
                            <Button type="button" size="sm" variant="outline">
                              編集
                            </Button>
                          </Link>
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
