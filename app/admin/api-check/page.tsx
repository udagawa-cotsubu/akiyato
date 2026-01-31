"use client";

import { useEffect, useState } from "react";
import { checkApis, type ApiCheckResult } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

export default function AdminApiCheckPage() {
  const [result, setResult] = useState<ApiCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  const runCheck = async () => {
    setLoading(true);
    try {
      const r = await checkApis();
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">API 接続チェック</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenAI と Serper のキーが正しく設定され、実際に呼び出せるか確認します。
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">チェック中…</p>
      ) : result ? (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium">
              {result.openai.ok ? (
                <CheckCircle2Icon className="size-5 text-green-600" />
              ) : (
                <XCircleIcon className="size-5 text-destructive" />
              )}
              <span>OpenAI API</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.openai.message}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium">
              {result.serper.ok ? (
                <CheckCircle2Icon className="size-5 text-green-600" />
              ) : (
                <XCircleIcon className="size-5 text-muted-foreground" />
              )}
              <span>Serper API（任意）</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.serper.message}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium">
              {result.supabase.ok ? (
                <CheckCircle2Icon className="size-5 text-green-600" />
              ) : (
                <XCircleIcon className="size-5 text-destructive" />
              )}
              <span>Supabase（判定結果の保存）</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.supabase.message}
            </p>
          </div>
        </div>
      ) : null}

      <Button variant="outline" onClick={runCheck} disabled={loading}>
        再チェック
      </Button>
    </div>
  );
}
