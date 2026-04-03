import { Octokit } from "@octokit/rest";
import {
  createRun,
  deriveWebhookRunStatus,
  findRunByDeliveryId,
  updateRun,
} from "@/features/runs/server/runs.server";
import type { Project, RunRecord, WebhookPayload } from "@/types/domain";
import {
  fetchPullRequestDiff,
  postGitHubComment,
} from "@/features/github/server/pipeline/github.server";
import {
  generateFinalReview,
  generateQaCommand,
} from "@/features/github/server/pipeline/openai.server";
import { runTinyFishSse } from "@/features/github/server/pipeline/tinyfish.server";

const MAX_DIFF_LENGTH = 8000;

export async function runWebhookPipeline({
  project,
  payload,
  metadata,
  githubToken,
}: {
  project: Project;
  payload: WebhookPayload;
  metadata: { delivery: string | null; event: string | null };
  githubToken: string;
}): Promise<void> {
  const pr = payload.pull_request;
  const traceId = metadata.delivery ?? `local-${Date.now()}`;
  console.log("[TinyQA Pipeline] Starting pipeline", {
    traceId,
    projectId: project.id,
    repo: `${project.repo_owner}/${project.repo_name}`,
    prNumber: pr.number,
    delivery: metadata.delivery,
    event: metadata.event,
  });

  if (metadata.delivery) {
    const existing = await findRunByDeliveryId(project.id, metadata.delivery);
    if (existing) {
      console.log("[TinyQA] Skipping duplicate delivery", {
        traceId,
        delivery: metadata.delivery,
        runId: existing.id,
      });
      return;
    }
  }

  let runRecord: RunRecord | null = null;

  try {
    runRecord = await createRun({
      project_id: project.id,
      user_id: project.user_id,
      source: "webhook",
      status: "queued",
      repo_full_name: `${project.repo_owner}/${project.repo_name}`,
      target_url: project.staging_url,
      github_delivery_id: metadata.delivery,
      github_event: metadata.event,
      pr_number: pr.number,
      pr_title: pr.title,
      pr_url: pr.html_url,
    });
  } catch (error) {
    console.error("[TinyQA] Failed to create run record:", error);
  }

  try {
    console.log("[TinyQA Pipeline] Initializing GitHub client", {
      traceId,
      hasToken: Boolean(githubToken),
      runId: runRecord?.id ?? null,
    });
    const octokit = new Octokit({ auth: githubToken });
    const targetUrl = project.staging_url;

    const diffResult = await fetchPullRequestDiff({
      octokit,
      project,
      prNumber: pr.number,
      traceId,
    });
    const diff = diffResult.diff;
    const truncatedDiff =
      diff.length > MAX_DIFF_LENGTH
        ? `${diff.slice(0, MAX_DIFF_LENGTH)}\n... [diff truncated]`
        : diff;

    console.log("[TinyQA Pipeline] PR diff prepared", {
      traceId,
      prNumber: pr.number,
      source: diffResult.source,
      diffLength: diff.length,
    });
    const testCommand = await generateQaCommand({
      traceId,
      prTitle: pr.title,
      prDescription: pr.body,
      diffPromptLabel: diffResult.promptLabel,
      diffContent: truncatedDiff,
      targetUrl,
    });
    console.log("[TinyQA Pipeline] QA command generated", {
      traceId,
      commandLength: testCommand.length,
    });

    if (runRecord) {
      runRecord = await updateRun(runRecord.id, {
        goal: testCommand,
        browser_profile: "stealth",
      });
      console.log("[TinyQA Pipeline] Run updated with goal", {
        traceId,
        runId: runRecord.id,
      });
    }

    console.log("[TinyQA Pipeline] Starting TinyFish SSE run", {
      traceId,
      runId: runRecord?.id ?? null,
      targetUrl,
    });
    const tinyFishResult = await runTinyFishSse({
      runId: runRecord?.id ?? null,
      url: targetUrl,
      goal: testCommand,
      browserProfile: "stealth",
    });
    console.log("[TinyQA Pipeline] TinyFish SSE completed", {
      traceId,
      hasObservation: Boolean(tinyFishResult.observation),
      hasScreenshot: Boolean(tinyFishResult.screenshotUrl),
    });

    const reviewContent = await generateFinalReview({
      traceId,
      observation: tinyFishResult.observation || "(No observation returned)",
      diffPromptLabel: diffResult.promptLabel,
      diffContent: truncatedDiff,
      testCommand,
    });
    const finalStatus = deriveWebhookRunStatus(reviewContent);
    console.log("[TinyQA Pipeline] Review generated", {
      traceId,
      status: finalStatus,
      reviewLength: reviewContent.length,
    });

    let comment = `## 🔍 TinyQA — Autonomous Visual Test Report\n\n`;
    comment += `**PR:** #${pr.number} — ${pr.title}\n`;
    comment += `**Target URL:** ${targetUrl}\n`;
    comment += `**Test Command:** _${testCommand}_\n\n`;
    comment += `---\n\n`;
    comment += reviewContent;

    if (tinyFishResult.screenshotUrl) {
      comment += `\n\n---\n\n### 📸 Screenshot\n\n![TinyQA Screenshot](${tinyFishResult.screenshotUrl})`;
    }

    comment += "\n\n---\n_Powered by TinyQA — Autonomous AI Visual Testing_";

    const reviewCommentUrl = await postGitHubComment({
      octokit,
      project,
      prNumber: pr.number,
      body: comment,
    });
    console.log("[TinyQA Pipeline] GitHub comment result", {
      traceId,
      hasCommentUrl: Boolean(reviewCommentUrl),
    });

    if (runRecord) {
      await updateRun(runRecord.id, {
        status: finalStatus,
        result_text: reviewContent,
        screenshot_url: tinyFishResult.screenshotUrl,
        review_comment_url: reviewCommentUrl,
        completed_at: new Date().toISOString(),
      });
    }
    console.log("[TinyQA Pipeline] Pipeline completed", {
      traceId,
      runId: runRecord?.id ?? null,
      prNumber: pr.number,
      status: finalStatus,
    });
  } catch (error) {
    console.error("[TinyQA Pipeline] Pipeline error", {
      traceId,
      runId: runRecord?.id ?? null,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    });
    if (runRecord) {
      const failureReason =
        error instanceof Error ? error.message : "Webhook pipeline error.";
      const isTimeout = failureReason.toLowerCase().includes("timed out");
      await updateRun(runRecord.id, {
        status: isTimeout ? "timed_out" : "error",
        failure_reason: failureReason,
        completed_at: new Date().toISOString(),
      });
    }

    throw error;
  }
}

export function isAcceptedPullRequestEvent(
  payload: WebhookPayload,
  event: string | null,
): boolean {
  const action = payload.action;

  if (event !== "pull_request") {
    return false;
  }

  if (!action || !["opened", "synchronize", "reopened"].includes(action)) {
    return false;
  }

  if (!payload.pull_request) {
    return false;
  }

  return true;
}
