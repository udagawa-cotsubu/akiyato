import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const webhookUrl = process.env.NEXT_PUBLIC_SLACK_RESERVATION_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "Slack Webhook URL is not configured" },
      { status: 500 },
    );
  }

  const { text } = (await request.json()) as { text?: string };

  if (process.env.NODE_ENV !== "production") {
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "slack-webhook-debug",
        hypothesisId: "H2_SERVER_PROXY",
        location: "app/api/slack/reservations-import/route.ts:before-slack-fetch",
        message: "About to send Slack webhook from server",
        data: {
          hasWebhookUrl: !!webhookUrl,
          hasText: !!text,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
  }

  try {
    const slackResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (process.env.NODE_ENV !== "production") {
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/5124391d-9715-4eee-a097-8c80517c6a00", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "slack-webhook-debug",
          hypothesisId: "H2_SERVER_PROXY",
          location: "app/api/slack/reservations-import/route.ts:after-slack-fetch",
          message: "Slack webhook response",
          data: {
            ok: slackResponse.ok,
            status: slackResponse.status,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
    }

    if (!slackResponse.ok) {
      return NextResponse.json(
        { ok: false, error: "Slack webhook responded with non-2xx" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
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
          location: "app/api/slack/reservations-import/route.ts:catch-error",
          message: "Slack webhook fetch threw",
          data: {
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
    }

    return NextResponse.json(
      { ok: false, error: "Failed to send Slack webhook" },
      { status: 500 },
    );
  }
}

