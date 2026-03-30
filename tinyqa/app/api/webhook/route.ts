import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  isAcceptedPullRequestEvent,
} from "@/lib/github-webhook-pipeline";
import { enqueueWebhookJob } from "@/lib/webhook-jobs";
import type { Project, WebhookPayload } from "@/lib/types";

/**
 * Legacy route (dual-mode migration):
 * POST /api/webhook?project_id=<UUID>
 *
 * This path is kept for existing repo-specific webhook + PAT setups while
 * GitHub App global webhook mode is rolled out.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const event = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery");

  console.log("[TinyQA Legacy Webhook] Incoming delivery", {
    event,
    delivery,
    projectId,
  });

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isAcceptedPullRequestEvent(payload, event)) {
    return NextResponse.json({ message: "Ignored event" });
  }

  const supabase = createAdminClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const proj = project as Project;
  if (!proj.github_pat) {
    return NextResponse.json(
      {
        error:
          "This project has no legacy GitHub PAT. Configure PAT or switch this repo to GitHub App mode.",
      },
      { status: 400 },
    );
  }

  const enqueueResult = await enqueueWebhookJob({
    projectId: proj.id,
    mode: "legacy_project_pat",
    githubEvent: event,
    githubDeliveryId: delivery,
    payload,
  });

  console.log("[TinyQA Legacy Webhook] Job enqueue result", {
    delivery,
    duplicate: enqueueResult.duplicate,
    jobId: enqueueResult.jobId,
    projectId: proj.id,
  });

  if (enqueueResult.duplicate) {
    return NextResponse.json({
      received: true,
      duplicate: true,
      mode: "legacy_project_pat",
      project_id: projectId,
    });
  }

  return NextResponse.json({
    received: true,
    queued: true,
    job_id: enqueueResult.jobId,
    mode: "legacy_project_pat",
    project_id: projectId,
  });
}
