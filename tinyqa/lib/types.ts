export interface Project {
  id: string;
  user_id: string;
  repo_owner: string;
  repo_name: string;
  staging_url: string;
  github_pat: string;
  created_at: string;
}

export type RunSource = "webhook" | "manual_live_preview";

export type RunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "error"
  | "timed_out";

export interface RunRecord {
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

export interface RunListResponse {
  runs: RunRecord[];
}

export interface InsightsResponse {
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  timed_out_runs: number;
  manual_runs: number;
  webhook_runs: number;
  pass_rate: number;
  failures_by_repo: Array<{ repo_full_name: string; count: number }>;
  failures_by_status: Array<{ status: RunStatus; count: number }>;
}

export interface WebhookPayload {
  action: string;
  number: number;
  pull_request: {
    title: string;
    body: string | null;
    html_url: string;
    head: { sha: string };
    base: { ref: string };
    diff_url: string;
    number: number;
    user: { login: string };
  };
  repository: {
    owner: { login: string };
    name: string;
    full_name: string;
  };
}

export interface TinyFishRunResponse {
  run_id: string;
  status: string;
}

export interface TinyFishRunStatus {
  run_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  result?: string;
  steps?: Array<{ action?: string; screenshot_url?: string }>;
  screenshot_url?: string;
}
