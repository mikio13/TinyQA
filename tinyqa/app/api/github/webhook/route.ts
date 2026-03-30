import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  createInstallationAccessToken,
  verifyGitHubWebhookSignature,
} from "@/lib/github-app";
import {
  isAcceptedPullRequestEvent,
  runWebhookPipeline,
} from "@/lib/github-webhook-pipeline";
import type { Project, WebhookPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const event = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery");
  const signature = request.headers.get("x-hub-signature-256");
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "GITHUB_APP_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const isValidSignature = verifyGitHubWebhookSignature({
    payload: rawBody,
    signature,
    secret: webhookSecret,
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isAcceptedPullRequestEvent(payload, event)) {
    return NextResponse.json({ message: "Ignored event" });
  }

  const installationId = payload.installation?.id;
  const repositoryId = payload.repository?.id;

  if (!installationId || !repositoryId) {
    return NextResponse.json(
      { error: "GitHub App payload missing installation or repository id" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: mappedByIds, error: byIdsError } = await supabase
    .from("projects")
    .select("*")
    .eq("github_installation_id", installationId)
    .eq("github_repository_id", repositoryId)
    .limit(1)
    .maybeSingle();

  if (byIdsError) {
    console.error("[TinyQA App Webhook] Failed to resolve project by IDs", byIdsError);
  }

  let project = mappedByIds as Project | null;

  if (!project) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    const { data: fallbackByRepo, error: fallbackError } = await supabase
      .from("projects")
      .select("*")
      .eq("repo_owner", owner)
      .eq("repo_name", repo)
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      console.error("[TinyQA App Webhook] Fallback repo mapping error", fallbackError);
    }

    if (fallbackByRepo) {
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({
          github_installation_id: installationId,
          github_repository_id: repositoryId,
          github_repository_node_id: payload.repository.node_id ?? null,
        })
        .eq("id", fallbackByRepo.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("[TinyQA App Webhook] Failed to persist app mapping", updateError);
      } else {
        project = updatedProject as Project;
      }
    }
  }

  if (!project) {
    return NextResponse.json(
      { error: "No TinyQA project mapping found for this GitHub App event." },
      { status: 404 },
    );
  }

  let installationToken: string;
  try {
    installationToken = await createInstallationAccessToken(installationId);
  } catch (error) {
    console.error("[TinyQA App Webhook] Failed to create installation token", error);
    return NextResponse.json(
      { error: "Unable to create installation token" },
      { status: 500 },
    );
  }

  const responsePromise = runWebhookPipeline({
    project,
    payload,
    metadata: { delivery, event },
    githubToken: installationToken,
  });

  responsePromise.catch((error) => {
    console.error("[TinyQA App Webhook] Pipeline error:", error);
  });

  return NextResponse.json({
    received: true,
    mode: "github_app",
    project_id: project.id,
    repository_id: repositoryId,
    installation_id: installationId,
  });
}
