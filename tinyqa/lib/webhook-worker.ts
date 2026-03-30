import { createAdminClient } from "@/lib/supabase/admin-client";
import { createInstallationAccessToken } from "@/lib/github-app";
import { runWebhookPipeline } from "@/lib/github-webhook-pipeline";
import {
  claimWebhookJob,
  completeWebhookJob,
  failWebhookJob,
  listPendingWebhookJobs,
  type WebhookJob,
} from "@/lib/webhook-jobs";
import type { Project } from "@/lib/types";

async function resolveGitHubTokenForJob(
  job: WebhookJob,
  project: Project,
): Promise<string> {
  if (job.mode === "legacy_project_pat") {
    if (!project.github_pat) {
      throw new Error(
        "Legacy webhook job requires github_pat, but project has none.",
      );
    }
    return project.github_pat;
  }

  const installationId =
    job.payload.installation?.id ?? project.github_installation_id;

  if (!installationId) {
    throw new Error("GitHub App job missing installation id.");
  }

  return createInstallationAccessToken(installationId);
}

async function processOneWebhookJob(job: WebhookJob): Promise<void> {
  console.log("[TinyQA Worker] Processing job", {
    jobId: job.id,
    mode: job.mode,
    delivery: job.github_delivery_id,
    event: job.github_event,
  });

  const supabase = createAdminClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", job.project_id)
    .single();

  if (error || !project) {
    throw new Error(
      `Project not found for webhook job ${job.id}: ${error?.message ?? "not found"}`,
    );
  }

  const proj = project as Project;
  const githubToken = await resolveGitHubTokenForJob(job, proj);

  await runWebhookPipeline({
    project: proj,
    payload: job.payload,
    metadata: {
      delivery: job.github_delivery_id,
      event: job.github_event,
    },
    githubToken,
  });
}

export async function processWebhookJobs(options?: {
  maxJobs?: number;
}): Promise<{
  scanned: number;
  claimed: number;
  succeeded: number;
  failed: number;
}> {
  const maxJobs = options?.maxJobs ?? 3;
  const pending = await listPendingWebhookJobs(maxJobs);

  let claimed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const pendingJob of pending) {
    const claimedJob = await claimWebhookJob(pendingJob.id);
    if (!claimedJob) {
      continue;
    }

    claimed += 1;

    try {
      await processOneWebhookJob(claimedJob);
      await completeWebhookJob(claimedJob.id);
      succeeded += 1;
      console.log("[TinyQA Worker] Job completed", { jobId: claimedJob.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failWebhookJob(claimedJob.id, message);
      failed += 1;
      console.error("[TinyQA Worker] Job failed", {
        jobId: claimedJob.id,
        error: message,
      });
    }
  }

  return {
    scanned: pending.length,
    claimed,
    succeeded,
    failed,
  };
}
