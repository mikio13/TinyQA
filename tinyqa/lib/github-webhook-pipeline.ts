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

    console.log("[TinyQA Pipeline] Fetching PR details from GitHub", {
      traceId,
      repo: `${project.repo_owner}/${project.repo_name}`,
      prNumber: pr.number,
    });
    const { data: prData } = await octokit.pulls.get({
      owner: project.repo_owner,
      repo: project.repo_name,
      pull_number: pr.number,
    });

    const apiDiffUrl = `https://api.github.com/repos/${project.repo_owner}/${project.repo_name}/pulls/${pr.number}`;
    console.log("[TinyQA Pipeline] Fetching PR diff (API endpoint)", {
      traceId,
      apiDiffUrl,
    });

    const apiDiffResponse = await fetch(apiDiffUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3.diff",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    console.log("[TinyQA Pipeline] API diff fetch response", {
      traceId,
      ok: apiDiffResponse.ok,
      status: apiDiffResponse.status,
      statusText: apiDiffResponse.statusText,
    });

    let diff = "";
    if (apiDiffResponse.ok) {
      diff = await apiDiffResponse.text();
    } else {
      console.warn("[TinyQA Pipeline] API diff failed, falling back to prData.diff_url", {
        traceId,
        fallbackUrl: prData.diff_url,
      });
      const fallbackDiffResponse = await fetch(prData.diff_url, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3.diff",
        },
        cache: "no-store",
      });
      console.log("[TinyQA Pipeline] Fallback diff fetch response", {
        traceId,
        ok: fallbackDiffResponse.ok,
        status: fallbackDiffResponse.status,
        statusText: fallbackDiffResponse.statusText,
      });
      diff = await fallbackDiffResponse.text();
    }

    console.log("[TinyQA Pipeline] PR diff fetched", {
      traceId,
      prNumber: pr.number,
      diffLength: diff.length,
    });
    const maxDiffLength = 8000;
    const truncatedDiff =
      diff.length > maxDiffLength
        ? `${diff.slice(0, maxDiffLength)}\n... [diff truncated]`
        : diff;

    console.log("[TinyQA Pipeline] Requesting QA command from OpenAI", {
      traceId,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
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

    console.log("[TinyQA Pipeline] Requesting final review from OpenAI", {
      traceId,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
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
    console.log("[TinyQA Pipeline] Review generated", {
      traceId,
      status: finalStatus,
      reviewLength: reviewContent.length,
    });

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
  console.log("[TinyQA TinyFish] Sending SSE request", {
    runId,
    url,
    browserProfile,
    goalLength: goal.length,
    hasApiKey: Boolean(process.env.TINYFISH_API_KEY),
  });
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
  console.log("[TinyQA TinyFish] SSE initial response", {
    runId,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok || !response.body) {
    const errText = await response.text();
    console.error("[TinyQA TinyFish] SSE request failed", {
      runId,
      status: response.status,
      statusText: response.statusText,
      errorBody: errText,
    });
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

  while (true) {
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
        console.warn("[TinyQA TinyFish] Failed to parse SSE event payload", {
          runId,
          preview: rawPayload.slice(0, 200),
        });
        continue;
      }

      console.log("[TinyQA TinyFish] SSE event received", {
        runId,
        type: event.type ?? "unknown",
        hasResult: event.result !== undefined,
        hasError: Boolean(event.error),
      });

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
    console.error("[TinyQA TinyFish] SSE stream ended before COMPLETE event", {
      runId,
    });
    throw new Error("TinyFish SSE stream ended before completion.");
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
