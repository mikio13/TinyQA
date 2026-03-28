import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { Octokit } from "@octokit/rest";
import OpenAI from "openai";
import type { Project, WebhookPayload, TinyFishRunStatus } from "@/lib/types";

/**
 * POST /api/webhook?project_id=<UUID>
 *
 * GitHub Webhook receiver. Executes an async pipeline:
 * 1. Return 200 immediately so GitHub doesn't timeout
 * 2. Fetch project config from Supabase
 * 3. Get PR diff from GitHub via Octokit
 * 4. Generate test command via OpenAI
 * 5. Execute test via TinyFish browser automation
 * 6. Poll for completion
 * 7. Generate code review via OpenAI
 * 8. Post review comment back to GitHub PR
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  if (!projectId) {
    return NextResponse.json(
      { error: "project_id is required" },
      { status: 400 }
    );
  }

  // Parse the GitHub webhook payload
  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Only process pull_request events with relevant actions
  const action = payload.action;
  if (!action || !["opened", "synchronize", "reopened"].includes(action)) {
    return NextResponse.json({ message: "Ignored event action" });
  }

  if (!payload.pull_request) {
    return NextResponse.json({ message: "Not a pull_request event" });
  }

  // Return 200 immediately — process async
  // Using a fire-and-forget pattern for the long-running pipeline
  const responsePromise = processWebhook(projectId, payload);

  // Don't await — let it run in the background
  responsePromise.catch((err) =>
    console.error("[TinyQA Webhook] Pipeline error:", err)
  );

  return NextResponse.json({ received: true, project_id: projectId });
}

// ─── Async Pipeline ──────────────────────────────────────────────────────────

async function processWebhook(
  projectId: string,
  payload: WebhookPayload
): Promise<void> {
  const supabase = createAdminClient();
  const pr = payload.pull_request;

  console.log(
    `[TinyQA] Processing PR #${pr.number}: "${pr.title}" on ${payload.repository.full_name}`
  );

  // ── Step 1: Fetch project config ──
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

  // ── Step 2: Gather context from GitHub ──
  const octokit = new Octokit({ auth: proj.github_pat });

  // Fetch PR details
  const { data: prData } = await octokit.pulls.get({
    owner: proj.repo_owner,
    repo: proj.repo_name,
    pull_number: pr.number,
  });

  // Fetch the diff
  const diffResponse = await fetch(prData.diff_url, {
    headers: {
      Authorization: `Bearer ${proj.github_pat}`,
      Accept: "application/vnd.github.v3.diff",
    },
  });
  const diff = await diffResponse.text();

  // Truncate diff if too long (OpenAI context limits)
  const maxDiffLength = 8000;
  const truncatedDiff =
    diff.length > maxDiffLength
      ? diff.slice(0, maxDiffLength) + "\n... [diff truncated]"
      : diff;

  console.log(
    `[TinyQA] Fetched PR #${pr.number} — diff is ${diff.length} chars`
  );

  // ── Step 3: Generate test command via OpenAI ──
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const qaPrompt = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a QA Engineer. Translate this PR description and code diff into a single, strict, 1-2 sentence command for a browser automation bot to test this feature on a staging UI. 
        
The command should be specific and actionable — tell the bot exactly what to navigate to, what to click, what to type, and what to verify. 
Focus on the most impactful visual/functional change in the PR.
Return ONLY the command text, nothing else.`,
      },
      {
        role: "user",
        content: `PR Title: ${prData.title}

PR Description:
${prData.body || "(no description)"}

Code Diff:
${truncatedDiff}

Staging URL: ${proj.staging_url}`,
      },
    ],
    max_tokens: 300,
  });

  const testCommand =
    qaPrompt.choices[0]?.message?.content?.trim() ||
    "Navigate to the staging URL and check if the page loads correctly.";

  console.log(`[TinyQA] Generated test command: ${testCommand}`);

  // ── Step 4: Execute via TinyFish ──
  const tinyfishResponse = await fetch(
    "https://agent.tinyfish.ai/v1/automation/run-async",
    {
      method: "POST",
      headers: {
        "X-API-Key": process.env.TINYFISH_API_KEY!,
        "Content-Type": "application/json",
        browser_profile: "stealth",
      },
      body: JSON.stringify({
        url: proj.staging_url,
        goal: testCommand,
      }),
    }
  );

  if (!tinyfishResponse.ok) {
    const errText = await tinyfishResponse.text();
    console.error("[TinyQA] TinyFish run-async failed:", errText);

    // Post error comment on PR
    await postGitHubComment(
      octokit,
      proj,
      pr.number,
      `## 🔍 TinyQA — Visual Test Failed\n\n⚠️ Could not start browser automation test.\n\n**Error:** ${errText}`
    );
    return;
  }

  const runData = await tinyfishResponse.json();
  const runId = runData.run_id;

  console.log(`[TinyQA] TinyFish run started: ${runId}`);

  // ── Step 5: Poll for completion ──
  const result = await pollTinyFishRun(runId);

  if (!result) {
    await postGitHubComment(
      octokit,
      proj,
      pr.number,
      `## 🔍 TinyQA — Visual Test Timed Out\n\n⚠️ The browser automation test did not complete within the timeout period.`
    );
    return;
  }

  console.log(`[TinyQA] TinyFish run ${result.status}: ${runId}`);

  // Extract observation and screenshot
  const observation =
    typeof result.result === "string" ? result.result : JSON.stringify(result.result);
  
  let screenshotUrl: string | null = null;
  if (result.screenshot_url) {
    screenshotUrl = result.screenshot_url;
  } else if (result.steps && result.steps.length > 0) {
    // Get the last step's screenshot
    const lastStep = result.steps[result.steps.length - 1];
    if (lastStep.screenshot_url) {
      screenshotUrl = lastStep.screenshot_url;
    }
  }

  // ── Step 6: Code Review via OpenAI ──
  const reviewResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a Senior Code Reviewer for a CI/CD pipeline. The QA Agent visually tested a staging site and observed the following. Based on the observation and the code diff, determine if the test PASSED or FAILED.

Your response MUST follow this format:

## Result: PASSED ✅  (or)  ## Result: FAILED ❌

### Observation
[Summarize what the QA agent saw on the staging site]

### Analysis
[Explain whether the visual test matches the expected behavior from the code changes]

### Suggested Fix (if FAILED)
[If FAILED, provide a specific markdown-formatted code block suggesting the exact fix based on the diff. If PASSED, omit this section.]`,
      },
      {
        role: "user",
        content: `QA Agent's Observation:
${observation || "(No observation returned)"}

PR Diff:
${truncatedDiff}

Test Command Given:
${testCommand}`,
      },
    ],
    max_tokens: 1500,
  });

  const reviewContent =
    reviewResponse.choices[0]?.message?.content?.trim() ||
    "Unable to generate review.";

  // ── Step 7: Post comment back to GitHub PR ──
  let comment = `## 🔍 TinyQA — Autonomous Visual Test Report\n\n`;
  comment += `**PR:** #${pr.number} — ${prData.title}\n`;
  comment += `**Staging URL:** ${proj.staging_url}\n`;
  comment += `**Test Command:** _${testCommand}_\n\n`;
  comment += `---\n\n`;
  comment += reviewContent;

  if (screenshotUrl) {
    comment += `\n\n---\n\n### 📸 Screenshot\n\n![TinyQA Screenshot](${screenshotUrl})`;
  }

  comment += `\n\n---\n_Powered by TinyQA — Autonomous AI Visual Testing_`;

  await postGitHubComment(octokit, proj, pr.number, comment);

  console.log(`[TinyQA] Review posted to PR #${pr.number}`);
}

// ─── Helper: Poll TinyFish Run ────────────────────────────────────────────────

async function pollTinyFishRun(
  runId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<TinyFishRunStatus | null> {
  return new Promise((resolve) => {
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(
          `https://agent.tinyfish.ai/v1/runs/${runId}`,
          {
            headers: { "X-API-Key": process.env.TINYFISH_API_KEY! },
          }
        );

        if (!res.ok) {
          console.error(`[TinyQA] Poll failed (attempt ${attempts}):`, res.status);
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            resolve(null);
          }
          return;
        }

        const data: TinyFishRunStatus = await res.json();

        if (data.status === "COMPLETED" || data.status === "FAILED") {
          clearInterval(poll);
          resolve(data);
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          resolve(null);
        } else {
          console.log(
            `[TinyQA] Polling run ${runId} — status: ${data.status} (attempt ${attempts}/${maxAttempts})`
          );
        }
      } catch (err) {
        console.error(`[TinyQA] Poll error (attempt ${attempts}):`, err);
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          resolve(null);
        }
      }
    }, intervalMs);
  });
}

// ─── Helper: Post GitHub Comment ──────────────────────────────────────────────

async function postGitHubComment(
  octokit: Octokit,
  project: Project,
  prNumber: number,
  body: string
): Promise<void> {
  try {
    await octokit.issues.createComment({
      owner: project.repo_owner,
      repo: project.repo_name,
      issue_number: prNumber,
      body,
    });
  } catch (err) {
    console.error("[TinyQA] Failed to post GitHub comment:", err);
  }
}
