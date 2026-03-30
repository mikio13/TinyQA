import { NextRequest, NextResponse } from "next/server";
import { processWebhookJobs } from "@/lib/webhook-worker";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const workerSecret =
    process.env.WEBHOOK_WORKER_SECRET ?? process.env.CRON_SECRET ?? null;

  if (!workerSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${workerSecret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  console.log("[TinyQA Worker] Triggered job processing");
  const result = await processWebhookJobs({ maxJobs: 1 });
  console.log("[TinyQA Worker] Processing result", result);

  return NextResponse.json({
    ok: true,
    result,
    duration_ms: Date.now() - startedAt,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
