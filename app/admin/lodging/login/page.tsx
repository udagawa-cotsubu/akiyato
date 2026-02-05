"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLodgingAuth } from "@/lib/lodging/useLodgingAuth";
import { toast } from "sonner";

export default function LodgingLoginPage() {
  const router = useRouter();
  const { login } = useLodgingAuth();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "login-debug",
        hypothesisId: "H4",
        location: "app/admin/lodging/login/page.tsx:handleSubmit",
        message: "Submitting login form",
        data: { pinLength: pin.trim().length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    setLoading(true);
    try {
      const ok = await login(pin.trim());
      if (!ok) {
        toast.error("PIN が正しくありません");
        return;
      }
      toast.success("ログインしました");
      router.push("/admin/lodging");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>宿泊ダッシュボード ログイン</CardTitle>
          <CardDescription>事前に共有された PIN を入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pin">
                PIN
              </label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "ログイン中…" : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

