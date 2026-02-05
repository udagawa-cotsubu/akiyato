"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LodgingDashboardIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/lodging/import");
  }, [router]);
  return <div className="text-muted-foreground">読み込み中…</div>;
}

