"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MOCK_INNS = [
  { code: "001", name: "Sea Side 椿" },
  { code: "002", name: "Sea Side 椿 -はなれ-" },
  { code: "003", name: "河崎浪漫館" },
  { code: "004", name: "Active Art Hotel" },
  { code: "005", name: "癒しの空間 ZEN" },
  { code: "006", name: "DATE DREAM DATE home" },
  { code: "007", name: "Sei-Jima Retreat" },
  { code: "008", name: "ORIGAMI" },
  { code: "009", name: "奥阿賀七名庵 らくら" },
] as const;

export default function InnsAdminPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">宿管理</h2>
        <p className="text-sm text-muted-foreground">
          現時点ではモックデータとして、主要な宿を9件登録しています。将来的に編集・追加機能を実装予定です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">宿一覧（モック）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">コード</TableHead>
                  <TableHead>宿名</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_INNS.map((inn) => (
                  <TableRow key={inn.code}>
                    <TableCell className="font-mono text-sm">{inn.code}</TableCell>
                    <TableCell className="font-medium">{inn.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

