"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLodgingAuth } from "@/lib/lodging/useLodgingAuth";

export default function LodgingDashboardIndexPage() {
  const router = useRouter();
  const { authenticated, requireAuth } = useLodgingAuth();

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (authenticated) {
      router.replace("/admin/lodging/import");
    }
  }, [authenticated, router]);

  return <div className="text-muted-foreground">読み込み中…</div>;
}

