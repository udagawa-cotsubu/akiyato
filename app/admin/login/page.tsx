"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await login(pin.trim());
      if (!ok) {
        toast.error("PIN が正しくありません");
        return;
      }
      toast.success("ログインしました");
      // 完全遷移で AdminGate が localStorage を読んで認証済みと判定するようにする
      window.location.href = "/admin/judgements";
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>管理画面 ログイン</CardTitle>
          <CardDescription>PIN を入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-pin">
                PIN
              </label>
              <Input
                id="admin-pin"
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
