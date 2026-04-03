import type { RunRecord } from "@/types/domain";

export type TinyFishEvent = {
  type?: string;
  run_id?: string;
  streaming_url?: string;
  result?: unknown;
  error?: string;
  status?: string;
};

export function chooseActiveRun(runs: RunRecord[]): RunRecord | null {
  const active = runs.filter((run) => run.status === "queued" || run.status === "running");
  if (active.length === 0) {
    return null;
  }

  const webhookRun = active.find((run) => run.source === "webhook");
  return webhookRun ?? active[0];
}

export function getResultText(run: RunRecord | null): string {
  if (!run) {
    return "No active run.";
  }

  return run.result_text ?? run.failure_reason ?? "Waiting for result...";
}
