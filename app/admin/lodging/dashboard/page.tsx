"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 宿泊ダッシュボードのトップは稼働率ページへリダイレクト */
export default function LodgingDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/lodging/dashboard/occupancy");
  }, [router]);

  return <div className="text-muted-foreground">リダイレクト中…</div>;
}
