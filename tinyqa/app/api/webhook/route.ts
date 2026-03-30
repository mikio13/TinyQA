import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  isAcceptedPullRequestEvent,
  runWebhookPipeline,
} from "@/lib/github-webhook-pipeline";
import type { Project, WebhookPayload } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  console.log("[TinyQA Legacy Webhook] Triggering direct pipeline", {
    delivery,
    projectId: proj.id,
    repo: `${proj.repo_owner}/${proj.repo_name}`,
  });

  const pipelinePromise = runWebhookPipeline({
    project: proj,
    payload,
    metadata: {
      delivery,
      event,
    },
    githubToken: proj.github_pat,
  });

  pipelinePromise.catch((error) => {
    console.error("[TinyQA Legacy Webhook] Pipeline failed", {
      delivery,
      projectId: proj.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return NextResponse.json({
    received: true,
    processing: true,
    mode: "legacy_project_pat",
    project_id: projectId,
  });
}
