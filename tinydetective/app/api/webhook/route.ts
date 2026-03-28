import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  createRun,
  deriveWebhookRunStatus,
  persistTinyFishLifecycleEvent,
  type TinyFishSseEvent,
  updateRun,
} from "@/lib/runs";
import { Octokit } from "@octokit/rest";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type {
  Project,
  RunRecord,
  WebhookPayload,
} from "@/lib/types";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
});

const TINYFISH_STREAM_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

/**
 * POST /api/webhook?project_id=<UUID>
 *
 * GitHub Webhook receiver. Executes an async pipeline:
 * 1. Return 200 immediately so GitHub doesn't timeout
 * 2. Fetch project config from Supabase
 * 3. Get PR diff from GitHub via Octokit
 * 4. Generate test command via Gemini
 * 5. Execute TinyFish via SSE and persist STREAMING_URL early
 * 6. Generate code review via Gemini
 * 7. Post review comment back to GitHub PR
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const event = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery");
  const contentType = request.headers.get("content-type");

  console.log("[TinyQA Webhook] Incoming request", {
    delivery,
    event,
    projectId,
    contentType,
    url: request.url,
  });

  if (!projectId) {
    console.error("[TinyQA Webhook] Missing project_id");
    return NextResponse.json(
      { error: "project_id is required" },
      { status: 400 }
    );
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("[TinyQA Webhook] Invalid JSON payload", error);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const action = payload.action;
  if (!action || !["opened", "synchronize", "reopened"].includes(action)) {
    console.log("[TinyQA Webhook] Ignored action", { action, event });
    return NextResponse.json({ message: "Ignored event action" });
  }

  if (!payload.pull_request) {
    console.log("[TinyQA Webhook] Ignored non-PR payload", { event });
    return NextResponse.json({ message: "Not a pull_request event" });
  }

  console.log("[TinyQA Webhook] Accepted pull request event", {
    action,
    prNumber: payload.pull_request.number,
    repository: payload.repository.full_name,
  });

  const responsePromise = processWebhook(projectId, payload, {
    delivery,
    event,
  });

  responsePromise.catch((err) =>
    console.error("[TinyQA Webhook] Pipeline error:", err)
  );

  return NextResponse.json({ received: true, project_id: projectId });
}

async function processWebhook(
  projectId: string,
  payload: WebhookPayload,
  metadata: {
    delivery: string | null;
    event: string | null;
  }
): Promise<void> {
  const supabase = createAdminClient();
  const pr = payload.pull_request;

  console.log(
    `[TinyQA] Processing PR #${pr.number}: "${pr.title}" on ${payload.repository.full_name}`
  );

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("[TinyQA] Project not found:", projectId, projectError);
    return;
  }

  const proj = project as Project;
  let runRecord: RunRecord | null = null;

  try {
    runRecord = await createRun({
      project_id: proj.id,
      user_id: proj.user_id,
      source: "webhook",
      status: "queued",
      repo_full_name: `${proj.repo_owner}/${proj.repo_name}`,
      target_url: proj.staging_url,
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
    const octokit = new Octokit({ auth: proj.github_pat });
    const targetUrl = await resolveTargetUrlForPr({
      octokit,
      owner: proj.repo_owner,
      repo: proj.repo_name,
      prHeadSha: pr.head.sha,
      fallbackUrl: proj.staging_url,
    });

    if (runRecord) {
      runRecord = await updateRun(runRecord.id, {
        target_url: targetUrl,
      });
    }

    const { data: prData } = await octokit.pulls.get({
      owner: proj.repo_owner,
      repo: proj.repo_name,
      pull_number: pr.number,
    });

    const diffResponse = await fetch(prData.diff_url, {
      headers: {
        Authorization: `Bearer ${proj.github_pat}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });
    const diff = await diffResponse.text();
    const maxDiffLength = 8000;
    const truncatedDiff =
      diff.length > maxDiffLength
        ? `${diff.slice(0, maxDiffLength)}\n... [diff truncated]`
        : diff;

    console.log(
      `[TinyQA] Fetched PR #${pr.number} — diff is ${diff.length} chars`
    );

    const qaResponse = await model.invoke([
      new SystemMessage(
        `You are a QA Engineer. Translate this PR description and code diff into a single, strict, 1-2 sentence command for a browser automation bot to test this feature on a staging UI. 
        
The command should be specific and actionable — tell the bot exactly what to navigate to, what to click, what to type, and what to verify. 
Focus on the most impactful visual/functional change in the PR.
Return ONLY the command text, nothing else.`
      ),
      new HumanMessage(
        `PR Title: ${prData.title}

PR Description:
${prData.body || "(no description)"}

Code Diff:
${truncatedDiff}

Target URL: ${targetUrl}`
      ),
    ]);

    const testCommand =
      (typeof qaResponse.content === "string" ? qaResponse.content.trim() : "") ||
      "Navigate to the target preview URL and check if the page loads correctly.";

    console.log(`[TinyQA] Generated test command: ${testCommand}`);

    if (runRecord) {
      runRecord = await updateRun(runRecord.id, {
        goal: testCommand,
        browser_profile: "stealth",
      });
    }

    const tinyFishResult = await runTinyFishSse({
      runId: runRecord?.id ?? null,
      url: targetUrl,
      goal: testCommand,
      browserProfile: "stealth",
    });

    const reviewResponse = await model.invoke([
      new SystemMessage(
        `You are a Senior Code Reviewer for a CI/CD pipeline. The QA Agent visually tested a staging site and observed the following. Based on the observation and the code diff, determine if the test PASSED or FAILED.

Your response MUST follow this format:

## Result: PASSED ✅  (or)  ## Result: FAILED ❌

### Observation
[Summarize what the QA agent saw on the staging site]

### Analysis
[Explain whether the visual test matches the expected behavior from the code changes]

### Suggested Fix (if FAILED)
[If FAILED, provide a specific markdown-formatted code block suggesting the exact fix based on the diff. If PASSED, omit this section.]`
      ),
      new HumanMessage(
        `QA Agent's Observation:
${tinyFishResult.observation || "(No observation returned)"}

PR Diff:
${truncatedDiff}

Test Command Given:
${testCommand}`
      ),
    ]);

    const reviewContent =
      (typeof reviewResponse.content === "string" ? reviewResponse.content.trim() : "") ||
      "Unable to generate review.";
    const finalStatus = deriveWebhookRunStatus(reviewContent);

    let comment = `## 🔍 TinyQA — Autonomous Visual Test Report\n\n`;
    comment += `**PR:** #${pr.number} — ${prData.title}\n`;
    comment += `**Target URL:** ${targetUrl}\n`;
    comment += `**Test Command:** _${testCommand}_\n\n`;
    comment += `---\n\n`;
    comment += reviewContent;

    if (tinyFishResult.screenshotUrl) {
      comment += `\n\n---\n\n### 📸 Screenshot\n\n![TinyQA Screenshot](${tinyFishResult.screenshotUrl})`;
    }

    comment += `\n\n---\n_Powered by TinyQA — Autonomous AI Visual Testing_`;

    const reviewCommentUrl = await postGitHubComment(octokit, proj, pr.number, comment);

    if (runRecord) {
      await updateRun(runRecord.id, {
        status: finalStatus,
        result_text: reviewContent,
        screenshot_url: tinyFishResult.screenshotUrl,
        review_comment_url: reviewCommentUrl,
        completed_at: new Date().toISOString(),
      });
    }

    console.log(`[TinyQA] Review posted to PR #${pr.number}`);
  } catch (error) {
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

async function runTinyFishSse({
  runId,
  url,
  goal,
  browserProfile,
}: {
  runId: string | null;
  url: string;
  goal: string;
  browserProfile: "lite" | "stealth";
}): Promise<{ observation: string; screenshotUrl: string | null }> {
  const response = await fetch(TINYFISH_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.TINYFISH_API_KEY!,
    },
    body: JSON.stringify({
      url,
      goal,
      browser_profile: browserProfile,
    }),
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    const errText = await response.text();
    throw new Error(
      errText || "TinyFish SSE failed before a live preview could start."
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let observation = "";
  let screenshotUrl: string | null = null;
  let completed = false;
  const timeoutAt = Date.now() + 6 * 60 * 1000;

  while (Date.now() < timeoutAt) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLine = chunk
        .split("\n")
        .find((line) => line.trim().startsWith("data:"));

      if (!dataLine) {
        continue;
      }

      const rawPayload = dataLine.replace(/^data:\s*/, "").trim();
      if (!rawPayload) {
        continue;
      }

      let event: TinyFishSseEvent;
      try {
        event = JSON.parse(rawPayload) as TinyFishSseEvent;
      } catch {
        continue;
      }

      if (runId) {
        await persistTinyFishLifecycleEvent(runId, event);
      }

      if (typeof event.result === "string") {
        observation = event.result;
      } else if (event.result) {
        observation = JSON.stringify(event.result);
      }

      if (typeof (event as { screenshot_url?: unknown }).screenshot_url === "string") {
        screenshotUrl = (event as { screenshot_url?: string }).screenshot_url ?? null;
      }

      if (event.type === "COMPLETE") {
        completed = true;
        break;
      }

      if (event.type === "ERROR") {
        throw new Error(event.error ?? "TinyFish reported an error.");
      }
    }

    if (completed) {
      break;
    }
  }

  if (!completed) {
    throw new Error("TinyFish SSE run timed out before completion.");
  }

  return {
    observation: observation || "TinyFish completed the run but returned no observation.",
    screenshotUrl,
  };
}

async function postGitHubComment(
  octokit: Octokit,
  project: Project,
  prNumber: number,
  body: string
): Promise<string | null> {
  try {
    const { data } = await octokit.issues.createComment({
      owner: project.repo_owner,
      repo: project.repo_name,
      issue_number: prNumber,
      body,
    });
    return data.html_url ?? null;
  } catch (err) {
    console.error("[TinyQA] Failed to post GitHub comment:", err);
    return null;
  }
}

async function resolveTargetUrlForPr({
  octokit,
  owner,
  repo,
  prHeadSha,
  fallbackUrl,
}: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prHeadSha: string;
  fallbackUrl: string;
}): Promise<string> {
  const timeoutMs = 2 * 60 * 1000;
  const pollIntervalMs = 5000;
  const startedAt = Date.now();

  console.log("[TinyQA] Resolving deployment preview URL", {
    owner,
    repo,
    sha: prHeadSha,
  });

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const { data: deployments } = await octokit.repos.listDeployments({
        owner,
        repo,
        sha: prHeadSha,
        per_page: 20,
      });

      const prioritizedDeployments = deployments
        .slice()
        .sort((a, b) => {
          const aPreview = (a.environment ?? "").toLowerCase().includes("preview");
          const bPreview = (b.environment ?? "").toLowerCase().includes("preview");
          return Number(bPreview) - Number(aPreview);
        });

      for (const deployment of prioritizedDeployments) {
        const { data: statuses } = await octokit.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: deployment.id,
          per_page: 20,
        });

        const successStatus = statuses.find((status) => status.state === "success");
        if (!successStatus) {
          continue;
        }

        const previewUrl =
          successStatus.environment_url ??
          successStatus.target_url ??
          null;

        if (!previewUrl || !isLikelyWebPreviewUrl(previewUrl)) {
          continue;
        }

        console.log("[TinyQA] Using deployed preview URL", {
          deploymentId: deployment.id,
          previewUrl,
        });
        return previewUrl;
      }
    } catch (error) {
      console.warn("[TinyQA] Failed to resolve deployment status, retrying", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await sleep(pollIntervalMs);
  }

  console.warn("[TinyQA] Deployment preview URL not ready; falling back", {
    fallbackUrl,
  });
  return fallbackUrl;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLikelyWebPreviewUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname !== "api.github.com";
  } catch {
    return false;
  }
}
