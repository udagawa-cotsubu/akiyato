"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JudgeResultCard } from "@/components/judge/JudgeResultCard";
import { getById } from "@/lib/repositories/judgementsRepository";
import type { JudgementRecord } from "@/lib/types/judgement";

export default function JudgeThanksPage() {
  const params = useParams();
  const id = params.id as string;
  const [record, setRecord] = useState<JudgementRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getById(id).then((r) => {
      setRecord(r ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">該当する記録が見つかりません。</p>
        <Link href="/judge" className="cursor-pointer">
          <Button variant="outline">判定フォームへ</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-200 bg-[var(--background)]/98 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <Link href="/judge" className="cursor-pointer flex items-center gap-2.5 shrink-0">
            <img
              src="/logo-bk.svg"
              alt=""
              className="h-9 w-auto"
              width={40}
              height={35}
            />
            <span className="text-lg font-semibold tracking-tight">物件判定AI</span>
          </Link>
          <Link
            href="/admin/judgements"
            className="cursor-pointer text-muted-foreground text-sm underline shrink-0"
          >
            管理画面
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 text-base">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              お問い合わせありがとうございました
            </h2>
            <p className="mt-2 text-muted-foreground">
              ご入力いただいた内容を保存し、判定結果をお知らせします。
            </p>
          </div>

          <JudgeResultCard
            result={record.output}
            area_profile={record.area_profile}
            price_feedback={record.price_feedback}
            surrounding_rent_market={record.surrounding_rent_market}
            surrounding_rent_source={record.surrounding_rent_source}
            market_data={record.market_data}
          />

          <p className="text-center text-muted-foreground">
            <Link href="/judge" className="cursor-pointer underline">
              判定フォームに戻る
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
