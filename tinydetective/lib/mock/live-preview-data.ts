export type PreviewStatus =
  | "passed"
  | "failed"
  | "warning"
  | "pending"
  | "checking"
  | "healthy"
  | "degraded"
  | "deploying"
  | "syncing";

export interface PreviewChecklistItem {
  id: string;
  title: string;
  detail: string;
  state: PreviewStatus;
}

export interface PreviewActivityItem {
  id: string;
  label: string;
  detail: string;
  time: string;
  state: PreviewStatus;
}

export interface MetricItem {
  label: string;
  value: string;
}

export interface PRPreviewDemo {
  repository: string;
  branch: string;
  title: string;
  author: string;
  authorRole: string;
  status: PreviewStatus;
  lastUpdated: string;
  previewUrl: string;
  environment: string;
  summary: string;
  confidenceScore: string;
  reviewVerdict: string;
  metrics: MetricItem[];
  checklist: PreviewChecklistItem[];
  activity: PreviewActivityItem[];
}

export interface InfraServiceStatus {
  name: string;
  provider: "Supabase" | "AWS" | "Preview";
  detail: string;
  latency: string;
  state: PreviewStatus;
}

export interface InfraPreviewDemo {
  environmentName: string;
  status: PreviewStatus;
  previewUrl: string;
  releaseVersion: string;
  region: string;
  lastDeployed: string;
  summary: string;
  reflectedChange: string;
  metrics: MetricItem[];
  services: InfraServiceStatus[];
  checks: PreviewChecklistItem[];
  logs: PreviewActivityItem[];
}

export const prPreviewDemo: PRPreviewDemo = {
  repository: "tinyfish-ai/tinydetective",
  branch: "feat/fix-resolution-checker",
  title: "Verify checkout toast and mobile CTA alignment after issue triage",
  author: "Alicia Tan",
  authorRole: "Frontend Engineer",
  status: "checking",
  lastUpdated: "2 minutes ago",
  previewUrl: "https://preview-pr-214.tinyfish.app",
  environment: "Vercel Preview / PR #214",
  summary:
    "TinyFish is replaying the reported checkout flow and comparing the updated preview against the fix intent from the pull request.",
  confidenceScore: "91%",
  reviewVerdict: "Fixes likely resolved, with one spacing warning on compact screens.",
  metrics: [
    { label: "PR Number", value: "#214" },
    { label: "Checks Running", value: "4 / 5" },
    { label: "Screenshot Diff", value: "2.3%" },
    { label: "Preview Uptime", value: "99.98%" },
  ],
  checklist: [
    {
      id: "cta-alignment",
      title: "Mobile CTA is centered inside the sticky footer",
      detail: "Comparing latest preview against the bug report screenshots.",
      state: "checking",
    },
    {
      id: "toast-dismiss",
      title: "Success toast disappears after checkout completion",
      detail: "Observed toast exits within the expected animation window.",
      state: "passed",
    },
    {
      id: "pricing-card",
      title: "Pricing card spacing remains stable on 390px width",
      detail: "One small vertical rhythm shift still appears near the footer.",
      state: "warning",
    },
    {
      id: "error-copy",
      title: "Empty state copy matches the PR acceptance criteria",
      detail: "Text verification is queued after the final screenshot pass.",
      state: "pending",
    },
  ],
  activity: [
    {
      id: "boot",
      label: "Preview session started",
      detail: "TinyFish launched the PR preview in a clean browser context.",
      time: "10:42 AM",
      state: "passed",
    },
    {
      id: "auth",
      label: "Authenticated with seeded demo user",
      detail: "Restored the cart state needed to reproduce the original issue.",
      time: "10:43 AM",
      state: "passed",
    },
    {
      id: "checkout",
      label: "Checkout flow replay in progress",
      detail: "Collecting final frame snapshots and verifying the sticky footer layout.",
      time: "10:44 AM",
      state: "checking",
    },
    {
      id: "review",
      label: "AI review draft pending",
      detail: "Review comment will be posted once all checklist items settle.",
      time: "Next",
      state: "pending",
    },
  ],
};

export const infraPreviewDemo: InfraPreviewDemo = {
  environmentName: "staging-us-east-1 / preview-aws-supabase",
  status: "healthy",
  previewUrl: "https://infra-preview.tinyfish.app",
  releaseVersion: "deploy-2026.03.28-rc2",
  region: "us-east-1",
  lastDeployed: "6 minutes ago",
  summary:
    "This environment confirms that backend-linked changes are live, data pipelines are reachable, and the preview frontend is reading from the expected infra stack.",
  reflectedChange:
    "Supabase row sync and AWS asset proxy changes are reflected in the preview without schema drift.",
  metrics: [
    { label: "Provider Pair", value: "Supabase + AWS" },
    { label: "Deployment Health", value: "Healthy" },
    { label: "Service Readiness", value: "5 / 6 ready" },
    { label: "Last Sync Drift", value: "< 12s" },
  ],
  services: [
    {
      name: "Supabase Auth",
      provider: "Supabase",
      detail: "Session refresh and protected route access verified.",
      latency: "148 ms",
      state: "healthy",
    },
    {
      name: "Supabase Postgres",
      provider: "Supabase",
      detail: "Preview reads migrated fields and seeded verification records.",
      latency: "42 ms",
      state: "healthy",
    },
    {
      name: "AWS Asset Proxy",
      provider: "AWS",
      detail: "Serving signed screenshots used for before/after comparison.",
      latency: "231 ms",
      state: "syncing",
    },
    {
      name: "AWS Queue Worker",
      provider: "AWS",
      detail: "Recent deploy picked up the verification job schema changes.",
      latency: "71 ms",
      state: "deploying",
    },
    {
      name: "Preview Frontend",
      provider: "Preview",
      detail: "Bound to the new environment variables and responding normally.",
      latency: "96 ms",
      state: "healthy",
    },
  ],
  checks: [
    {
      id: "env-vars",
      title: "Preview points to the intended Supabase project",
      detail: "Validated against the environment manifest for this preview.",
      state: "passed",
    },
    {
      id: "storage-proxy",
      title: "AWS-backed screenshot proxy serves the latest visual artifacts",
      detail: "One worker is still rolling forward, but requests remain available.",
      state: "warning",
    },
    {
      id: "db-schema",
      title: "Migration-backed fields are reflected in the preview data layer",
      detail: "Synthetic records returned the new verification metadata.",
      state: "passed",
    },
    {
      id: "replay-sync",
      title: "Verification replay jobs are consuming the new queue payload",
      detail: "Waiting for the last worker to finish deployment.",
      state: "checking",
    },
  ],
  logs: [
    {
      id: "deploy",
      label: "Environment deploy completed",
      detail: "Release deploy-2026.03.28-rc2 promoted to staging.",
      time: "10:37 AM",
      state: "passed",
    },
    {
      id: "supabase",
      label: "Supabase connectivity verified",
      detail: "Database and auth checks completed with no drift detected.",
      time: "10:39 AM",
      state: "passed",
    },
    {
      id: "worker",
      label: "Queue worker syncing new runtime image",
      detail: "Warm-up completes before verification jobs switch to healthy.",
      time: "10:41 AM",
      state: "deploying",
    },
    {
      id: "preview",
      label: "Preview health stream active",
      detail: "TinyFish is watching for schema, asset, and service mismatches.",
      time: "Live",
      state: "healthy",
    },
  ],
};
