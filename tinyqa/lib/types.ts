export interface Project {
  id: string;
  user_id: string;
  repo_owner: string;
  repo_name: string;
  staging_url: string;
  github_pat: string;
  created_at: string;
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
