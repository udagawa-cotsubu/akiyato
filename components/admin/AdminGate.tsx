"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";
import { AdminShell } from "./AdminShell";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated } = useAdminAuth();

  useEffect(() => {
    if (authenticated === null) return;
    if (pathname === "/admin/login") return;
    if (authenticated === false) {
      router.replace("/admin/login");
    }
  }, [authenticated, pathname, router]);

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (authenticated === false) {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
