"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchInns } from "@/lib/lodging/repository";
import type { Inn } from "@/lib/types/lodging";

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
    const codeA = a.tag ?? "";
    const codeB = b.tag ?? "";
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">宿管理</h2>
        <p className="text-sm text-muted-foreground">
          Supabase（または IndexedDB）に登録されている宿一覧です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">宿一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">読み込み中…</p>
          ) : inns.length === 0 ? (
            <p className="text-muted-foreground">宿が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">コード</TableHead>
                    <TableHead>宿名</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInns.map((inn) => (
                    <TableRow key={inn.id}>
                      <TableCell className="font-mono text-sm">{inn.tag ?? "-"}</TableCell>
                      <TableCell className="font-medium">{inn.name}</TableCell>
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
