import { createAdminClient } from "@/lib/supabase/admin-client";
import type { WebhookPayload } from "@/lib/types";

export type WebhookJobMode = "legacy_project_pat" | "github_app";
export type WebhookJobStatus = "pending" | "processing" | "done" | "failed";

export interface WebhookJob {
  id: string;
  project_id: string;
  mode: WebhookJobMode;
  github_event: string | null;
  github_delivery_id: string | null;
  payload: WebhookPayload;
  status: WebhookJobStatus;
  attempts: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapWebhookJob(row: Record<string, unknown>): WebhookJob {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    mode: row.mode as WebhookJobMode,
    github_event: (row.github_event as string | null) ?? null,
    github_delivery_id: (row.github_delivery_id as string | null) ?? null,
    payload: row.payload as WebhookPayload,
    status: row.status as WebhookJobStatus,
    attempts: Number(row.attempts ?? 0),
    last_error: (row.last_error as string | null) ?? null,
    processed_at: (row.processed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function enqueueWebhookJob(input: {
  projectId: string;
  mode: WebhookJobMode;
  githubEvent: string | null;
  githubDeliveryId: string | null;
  payload: WebhookPayload;
}): Promise<{ jobId: string | null; duplicate: boolean }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("webhook_jobs")
    .insert({
      project_id: input.projectId,
      mode: input.mode,
      github_event: input.githubEvent,
      github_delivery_id: input.githubDeliveryId,
      payload: input.payload,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    const isDuplicate = error.code === "23505";
    if (isDuplicate) {
      return { jobId: null, duplicate: true };
    }
    throw new Error(`Failed to enqueue webhook job: ${error.message}`);
  }

  return { jobId: (data?.id as string | null) ?? null, duplicate: false };
}

export async function listPendingWebhookJobs(limit = 10): Promise<WebhookJob[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("webhook_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list pending webhook jobs: ${error.message}`);
  }

  return (data ?? []).map((row) => mapWebhookJob(row as Record<string, unknown>));
}

export async function claimWebhookJob(
  jobId: string,
): Promise<WebhookJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("webhook_jobs")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  const job = mapWebhookJob(data as Record<string, unknown>);

  const { data: attemptRow, error: attemptError } = await supabase
    .from("webhook_jobs")
    .update({
      attempts: job.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (attemptError || !attemptRow) {
    return job;
  }

  return mapWebhookJob(attemptRow as Record<string, unknown>);
}

export async function completeWebhookJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("webhook_jobs")
    .update({
      status: "done",
      processed_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to mark job done: ${error.message}`);
  }
}

export async function failWebhookJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("webhook_jobs")
    .update({
      status: "failed",
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to mark job failed: ${error.message}`);
  }
}
