import { Octokit } from "@octokit/rest";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  createRun,
  deriveWebhookRunStatus,
  findRunByDeliveryId,
  persistTinyFishLifecycleEvent,
  type TinyFishSseEvent,
  updateRun,
} from "@/lib/runs";
import type { Project, RunRecord, WebhookPayload } from "@/lib/types";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
});

const TINYFISH_STREAM_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

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

  if (metadata.delivery) {
    const existing = await findRunByDeliveryId(project.id, metadata.delivery);
    if (existing) {
      console.log("[TinyQA] Skipping duplicate delivery", {
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
    const octokit = new Octokit({ auth: githubToken });
    const targetUrl = project.staging_url;

    const { data: prData } = await octokit.pulls.get({
      owner: project.repo_owner,
      repo: project.repo_name,
      pull_number: pr.number,
    });

    const diffResponse = await fetch(prData.diff_url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
      cache: "no-store",
    });
    const diff = await diffResponse.text();
    const maxDiffLength = 8000;
    const truncatedDiff =
      diff.length > maxDiffLength
        ? `${diff.slice(0, maxDiffLength)}\n... [diff truncated]`
        : diff;

    const qaResponse = await model.invoke([
      new SystemMessage(
        `You are a QA Engineer. Translate this PR description and code diff into a single, strict, 1-2 sentence command for a browser automation bot to test this feature on a staging UI.\n\nThe command should be specific and actionable — tell the bot exactly what to navigate to, what to click, what to type, and what to verify.\nFocus on the most impactful visual/functional change in the PR.\nReturn ONLY the command text, nothing else.`,
      ),
      new HumanMessage(
        `PR Title: ${prData.title}\n\nPR Description:\n${prData.body || "(no description)"}\n\nCode Diff:\n${truncatedDiff}\n\nTarget URL: ${targetUrl}`,
      ),
    ]);

    const testCommand =
      (typeof qaResponse.content === "string" ? qaResponse.content.trim() : "") ||
      "Navigate to the target preview URL and check if the page loads correctly.";

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
        `You are a Senior Code Reviewer for a CI/CD pipeline. The QA Agent visually tested a staging site and observed the following. Based on the observation and the code diff, determine if the test PASSED or FAILED.\n\nYour response MUST follow this format:\n\n## Result: PASSED ✅  (or)  ## Result: FAILED ❌\n\n### Observation\n[Summarize what the QA agent saw on the staging site]\n\n### Analysis\n[Explain whether the visual test matches the expected behavior from the code changes]\n\n### Suggested Fix (if FAILED)\n[If FAILED, provide a specific markdown-formatted code block suggesting the exact fix based on the diff. If PASSED, omit this section.]`,
      ),
      new HumanMessage(
        `QA Agent's Observation:\n${tinyFishResult.observation || "(No observation returned)"}\n\nPR Diff:\n${truncatedDiff}\n\nTest Command Given:\n${testCommand}`,
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

    comment += "\n\n---\n_Powered by TinyQA — Autonomous AI Visual Testing_";

    const reviewCommentUrl = await postGitHubComment(
      octokit,
      project,
      pr.number,
      comment,
    );

    if (runRecord) {
      await updateRun(runRecord.id, {
        status: finalStatus,
        result_text: reviewContent,
        screenshot_url: tinyFishResult.screenshotUrl,
        review_comment_url: reviewCommentUrl,
        completed_at: new Date().toISOString(),
      });
    }
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
      errText || "TinyFish SSE failed before a live preview could start.",
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

      if (
        typeof (event as { screenshot_url?: unknown }).screenshot_url === "string"
      ) {
        screenshotUrl =
          (event as { screenshot_url?: string }).screenshot_url ?? null;
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
    observation:
      observation || "TinyFish completed the run but returned no observation.",
    screenshotUrl,
  };
}

async function postGitHubComment(
  octokit: Octokit,
  project: Project,
  prNumber: number,
  body: string,
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
