import { createAdminClient } from "@/lib/supabase/admin-client";
import type { RunRecord, RunSource, RunStatus } from "@/types/domain";

interface RunRow {
  id: string;
  project_id: string;
  user_id: string;
  source: RunSource;
  status: RunStatus;
  tinyfish_run_id: string | null;
  streaming_url: string | null;
  github_delivery_id: string | null;
  github_event: string | null;
  pr_number: number | null;
  pr_title: string | null;
  pr_url: string | null;
  repo_full_name: string;
  target_url: string;
  goal: string | null;
  browser_profile: string | null;
  result_text: string | null;
  review_comment_url: string | null;
  screenshot_url: string | null;
  failure_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRunInput {
  project_id: string;
  user_id: string;
  source: RunSource;
  status: RunStatus;
  repo_full_name: string;
  target_url: string;
  github_delivery_id?: string | null;
  github_event?: string | null;
  pr_number?: number | null;
  pr_title?: string | null;
  pr_url?: string | null;
  goal?: string | null;
  browser_profile?: string | null;
}

export interface UpdateRunInput {
  status?: RunStatus;
  target_url?: string;
  tinyfish_run_id?: string | null;
  streaming_url?: string | null;
  goal?: string | null;
  browser_profile?: string | null;
  result_text?: string | null;
  review_comment_url?: string | null;
  screenshot_url?: string | null;
  failure_reason?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface TinyFishSseEvent {
  type?: string;
  run_id?: string;
  streaming_url?: string;
  result?: unknown;
  status?: string;
  error?: string;
  purpose?: string;
  timestamp?: string;
}

export function mapRunRow(row: RunRow): RunRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    source: row.source,
    status: row.status,
    tinyfish_run_id: row.tinyfish_run_id,
    streaming_url: row.streaming_url,
    github_delivery_id: row.github_delivery_id,
    github_event: row.github_event,
    pr_number: row.pr_number,
    pr_title: row.pr_title,
    pr_url: row.pr_url,
    repo_full_name: row.repo_full_name,
    target_url: row.target_url,
    goal: row.goal,
    browser_profile: row.browser_profile,
    result_text: row.result_text,
    review_comment_url: row.review_comment_url,
    screenshot_url: row.screenshot_url,
    failure_reason: row.failure_reason,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createRun(input: CreateRunInput): Promise<RunRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("runs")
    .insert({
      ...input,
      github_delivery_id: input.github_delivery_id ?? null,
      github_event: input.github_event ?? null,
      pr_number: input.pr_number ?? null,
      pr_title: input.pr_title ?? null,
      pr_url: input.pr_url ?? null,
      goal: input.goal ?? null,
      browser_profile: input.browser_profile ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create run: ${error?.message ?? "Unknown error"}`);
  }

  return mapRunRow(data as RunRow);
}

export async function findRunByDeliveryId(
  projectId: string,
  deliveryId: string,
): Promise<RunRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("project_id", projectId)
    .eq("github_delivery_id", deliveryId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRunRow(data as RunRow);
}

export async function updateRun(
  runId: string,
  updates: UpdateRunInput
): Promise<RunRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("runs")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update run: ${error?.message ?? "Unknown error"}`);
  }

  return mapRunRow(data as RunRow);
}

export function deriveWebhookRunStatus(reviewContent: string): RunStatus {
  return reviewContent.includes("## Result: PASSED") ? "passed" : "failed";
}

export function deriveTinyFishRunStatus(status?: string): RunStatus {
  return status === "FAILED" ? "failed" : "passed";
}

export async function persistTinyFishLifecycleEvent(
  runId: string,
  event: TinyFishSseEvent
): Promise<void> {
  if (!event.type) {
    return;
  }

  if (event.type === "STARTED") {
    await updateRun(runId, {
      tinyfish_run_id: event.run_id ?? null,
      status: "running",
      started_at: new Date().toISOString(),
    });
    return;
  }

  if (event.type === "STREAMING_URL") {
    await updateRun(runId, {
      streaming_url: event.streaming_url ?? null,
    });
    return;
  }

  if (event.type === "COMPLETE") {
    await updateRun(runId, {
      status: deriveTinyFishRunStatus(event.status),
      result_text:
        typeof event.result === "string"
          ? event.result
          : JSON.stringify(event.result ?? null, null, 2),
      completed_at: new Date().toISOString(),
    });
    return;
  }

  if (event.type === "ERROR") {
    await updateRun(runId, {
      status: "error",
      failure_reason: event.error ?? "TinyFish reported an error.",
      completed_at: new Date().toISOString(),
    });
  }
}
