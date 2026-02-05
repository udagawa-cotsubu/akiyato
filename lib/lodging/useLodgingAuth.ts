"use client";

/**
 * 宿泊ダッシュボード用の簡易認証フック
 *
 * - 固定 PIN を入力したらローカルストレージにフラグを保存
 * - `/admin/lodging` 配下でログイン状態をチェックしてガードに利用
 * - 将来 Supabase Auth に差し替える場合は、このフックを差し替える
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "lodging_admin_authenticated";
// 簡易 PIN。必要に応じて環境変数から差し替え可能
const DEFAULT_PIN = process.env.NEXT_PUBLIC_LODGING_ADMIN_PIN ?? "1234";

export function useLodgingAuth() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = window.localStorage.getItem(STORAGE_KEY);
    setAuthenticated(value === "true");
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "login-debug",
        hypothesisId: "H1",
        location: "lib/lodging/useLodgingAuth.ts:useEffect",
        message: "Loaded auth state from localStorage",
        data: { rawValue: value },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
  }, []);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    const ok = pin === DEFAULT_PIN;
    if (ok && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setAuthenticated(true);
    }
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "login-debug",
        hypothesisId: "H2",
        location: "lib/lodging/useLodgingAuth.ts:login",
        message: "Login attempt",
        data: { inputPin: pin, defaultPin: DEFAULT_PIN, ok },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
    return ok;
  }, []);

  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthenticated(false);
    router.push("/admin/lodging/login");
  }, [router]);

  const requireAuth = useCallback(() => {
    if (authenticated === false) {
      router.replace("/admin/lodging/login");
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "login-debug",
          hypothesisId: "H3",
          location: "lib/lodging/useLodgingAuth.ts:requireAuth",
          message: "Redirecting to login from requireAuth",
          data: { authenticated },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
    }
  }, [authenticated, router]);

  return {
    authenticated,
    login,
    logout,
    requireAuth,
  };
}

