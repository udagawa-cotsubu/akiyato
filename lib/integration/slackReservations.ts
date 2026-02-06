import type { ImportedReservationSummary } from "@/lib/lodging/repository";

type ImportSourceType = "checkin" | "reservation" | "cancel";

interface ReservationImportNotificationParams {
  importSourceType: ImportSourceType;
  totalCount: number;
  reservations: ImportedReservationSummary[];
}

function buildTitle(importSourceType: ImportSourceType): string {
  switch (importSourceType) {
    case "reservation":
      return "【予約日インポート】";
    case "cancel":
      return "【キャンセル日インポート】";
    case "checkin":
    default:
      return "【チェックイン日インポート】";
  }
}

function buildSlackText(params: ReservationImportNotificationParams): string {
  const { importSourceType, totalCount, reservations } = params;
  const lines: string[] = [];

  if (reservations.length === 0) {
    if (importSourceType === "reservation") {
      lines.push("昨日の予約データはございません");
    } else if (importSourceType === "cancel") {
      lines.push("昨日のキャンセルデータはございません");
    } else {
      lines.push("該当する予約データはございません");
    }
  } else {
    const active = reservations.filter((r) => r.status !== "キャンセル");
    const canceled = reservations.filter((r) => r.status === "キャンセル");

    const formatDate = (value: string | null): string => {
      if (!value) return "-";
      return value.replace(/-/g, "/");
    };

    const formatLine = (r: ImportedReservationSummary, opts?: { withEmojiDate?: boolean }): string => {
      const withEmojiDate = opts?.withEmojiDate ?? false;
      const nightsLabel = r.nights != null ? `${r.nights}泊` : "-泊";
      const adults = r.adults ?? 0;
      const children = r.children ?? 0;
      const amount =
        r.saleAmount != null ? `¥${r.saleAmount.toLocaleString("ja-JP")}` : "¥0";
      const ratePlan = r.ratePlan ?? "-";
      const inn = r.innName ?? "-";
      const source = r.source ?? "-";
      const checkIn = formatDate(r.checkIn ?? null);
      const checkOut = formatDate(r.checkOut ?? null);

      const dateLinePrefix = withEmojiDate ? ":date: " : "";

      return [
        `宿名： ${inn} ｜ ${source}`,
        `${dateLinePrefix}${checkIn} → ${checkOut}（${nightsLabel}）`,
        ` 大人${adults}・子供${children}`,
        ` ${ratePlan} ｜ ${amount}`,
      ].join("\n");
    };

    if (active.length > 0) {
      lines.push("");
      lines.push(`:pencil2:予約一覧（${active.length}件）`);
      active.forEach((r, index) => {
        if (index > 0) {
          lines.push("────────────────────");
        }
        lines.push(formatLine(r, { withEmojiDate: true }));
      });
    }

    if (canceled.length > 0) {
      lines.push("");
      lines.push(`:heavy_multiplication_x:キャンセル一覧（${canceled.length}件）`);
      canceled.forEach((r, index) => {
        if (index > 0) {
          lines.push("────────────────────");
        }
        lines.push(formatLine(r, { withEmojiDate: true }));
      });
    }
  }

  return lines.join("\n");
}

export async function postReservationImportNotification(
  params: ReservationImportNotificationParams,
): Promise<void> {
  const text = buildSlackText(params);

  try {
    if (process.env.NODE_ENV !== "production") {
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "slack-webhook-debug",
          hypothesisId: "H2_SERVER_PROXY",
          location: "lib/integration/slackReservations.ts:before-api-call",
          message: "About to call internal Slack proxy API",
          data: {
            hasText: !!text,
            importSourceType: params.importSourceType,
            totalCount: params.totalCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
    }

    await fetch("/api/slack/reservations-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "slack-webhook-debug",
          hypothesisId: "H2_SERVER_PROXY",
          location: "lib/integration/slackReservations.ts:catch-api-call",
          message: "Internal Slack proxy API call failed",
          data: {
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
    }

    console.error("Failed to call internal Slack reservation import API", error);
  }
}

