"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 旧稼働率URLはダッシュボードトップへリダイレクト */
export default function LodgingOccupancyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/lodging/dashboard");
  }, [router]);

  return <div className="text-muted-foreground">リダイレクト中…</div>;
}
