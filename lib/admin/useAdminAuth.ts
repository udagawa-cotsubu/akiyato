"use client";

/**
 * 管理画面全体用の簡易認証フック
 * - PIN 1192 でログインすると localStorage にフラグを保存
 * - /admin/* にアクセスする際に未認証なら /admin/login へリダイレクト
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "admin_authenticated";
const ADMIN_PIN = "1192";

export function useAdminAuth() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuthenticated(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    const ok = pin === ADMIN_PIN;
    if (ok && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setAuthenticated(true);
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthenticated(false);
    router.push("/admin/login");
  }, [router]);

  return {
    authenticated,
    login,
    logout,
  };
}
