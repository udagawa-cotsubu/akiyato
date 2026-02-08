"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 旧ADR URLはダッシュボードトップへリダイレクト */
export default function LodgingAdrRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/lodging/dashboard");
  }, [router]);

  return <div className="text-muted-foreground">リダイレクト中…</div>;
}
