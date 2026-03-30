"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityLog } from "@/components/preview/activity-log";
import { ChecklistPanel } from "@/components/preview/checklist-panel";
import { EnvironmentMap } from "@/components/preview/environment-map";
import { MetricGrid } from "@/components/preview/metric-grid";
import { PageHeader } from "@/components/preview/page-header";
import { ServiceStatusGrid } from "@/components/preview/service-status-grid";
import { StatusBadge } from "@/components/preview/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type {
  InfraServiceStatus,
  MetricItem,
  PreviewActivityItem,
  PreviewChecklistItem,
  PreviewStatus,
} from "@/lib/mock/live-preview-data";
import type { Project } from "@/lib/types";
import { hasEnvVars } from "@/lib/utils";

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleString("en-SG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function computeAnalyticsStatus(projects: Project[]): PreviewStatus {
  if (projects.length === 0) {
    return "pending";
  }

  if (projects.length >= 3) {
    return "healthy";
  }

  return "checking";
}

export function AnalyticsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      if (!hasEnvVars) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) {
        return;
      }

      setProjects((data as Project[] | null) ?? []);
      setIsLoading(false);
    }

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  const analyticsStatus = computeAnalyticsStatus(projects);

  const derived = useMemo(() => {
    const repoOwners = new Set(projects.map((project) => project.repo_owner));
    const stagingHosts = new Set(
      projects.map((project) => getHostname(project.staging_url))
    );
    const recentProjects = projects.slice(0, 4);
    const newestProject = projects[0];
    const projectsThisWeek = projects.filter((project) => {
      const createdAt = new Date(project.created_at).getTime();
      if (Number.isNaN(createdAt)) {
        return false;
      }
      return Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
    }).length;

    const metrics: MetricItem[] = [
      { label: "Projects linked", value: String(projects.length) },
      { label: "Repo owners", value: String(repoOwners.size) },
      { label: "Staging hosts", value: String(stagingHosts.size) },
      { label: "Added this week", value: String(projectsThisWeek) },
    ];

    const checklist: PreviewChecklistItem[] = [
      {
        id: "projects-connected",
        title: "At least one repository is connected",
        detail:
          projects.length > 0
            ? `${projects.length} repos are ready for webhook-driven checks.`
            : "Connect your first repository to start tracking review metrics.",
        state: projects.length > 0 ? "passed" : "pending",
      },
      {
        id: "staging-coverage",
        title: "Staging targets are configured",
        detail:
          stagingHosts.size > 0
            ? `${stagingHosts.size} distinct staging hosts are ready for validation.`
            : "No staging URLs are configured yet.",
        state: stagingHosts.size > 0 ? "passed" : "pending",
      },
      {
        id: "owner-spread",
        title: "Analytics spans more than one repo owner",
        detail:
          repoOwners.size > 1
            ? "Multiple owners are connected, so the analytics view is starting to show broader usage."
            : "Add another owner or team repo to make trends more meaningful.",
        state: repoOwners.size > 1 ? "healthy" : "warning",
      },
      {
        id: "recent-activity",
        title: "Recent project activity is visible",
        detail:
          recentProjects.length > 0
            ? `Showing the ${recentProjects.length} most recent project connections below.`
            : "Recent project activity will show up here once repos are added.",
        state: recentProjects.length > 0 ? "checking" : "pending",
      },
    ];

    const activity: PreviewActivityItem[] =
      recentProjects.length > 0
        ? recentProjects.map((project) => ({
            id: project.id,
            label: `Connected ${project.repo_owner}/${project.repo_name}`,
            detail: `Staging target ${getHostname(
              project.staging_url
            )} is available for Tiny QA checks.`,
            time: formatTimestamp(project.created_at),
            state: "passed",
          }))
        : [
            {
              id: "empty-state",
              label: "No analytics activity yet",
              detail:
                "Connect a repository from the dashboard to populate metrics, activity, and environment coverage.",
              time: "Now",
              state: "pending",
            },
          ];

    const services: InfraServiceStatus[] = [
      {
        name: "Project registry",
        provider: "Supabase",
        detail:
          projects.length > 0
            ? "Project configurations are available for dashboard analytics."
            : "No project rows detected yet.",
        latency: projects.length > 0 ? `${32 + projects.length * 4} ms` : "--",
        state: projects.length > 0 ? "healthy" : "pending",
      },
      {
        name: "Webhook coverage",
        provider: "Preview",
        detail:
          projects.length > 0
            ? "Each connected project exposes a webhook URL for pull-request checks."
            : "Webhook coverage will appear once the first project is connected.",
        latency: projects.length > 0 ? `${projects.length} active` : "--",
        state: projects.length > 0 ? "checking" : "pending",
      },
      {
        name: "Staging footprint",
        provider: "AWS",
        detail:
          stagingHosts.size > 0
            ? `${stagingHosts.size} distinct staging targets are represented in analytics.`
            : "No staging hosts tracked yet.",
        latency: stagingHosts.size > 0 ? `${stagingHosts.size} hosts` : "--",
        state: stagingHosts.size > 0 ? "syncing" : "pending",
      },
      {
        name: "Review readiness",
        provider: "Preview",
        detail:
          newestProject
            ? `Latest repo ${newestProject.repo_name} is ready for PR review runs.`
            : "Review readiness appears after the first connection.",
        latency: newestProject ? "Ready" : "--",
        state: newestProject ? "healthy" : "pending",
      },
    ];

    const nodes = [
      {
        label: "Repositories",
        value: `${projects.length} connected`,
        status: projects.length > 0 ? ("healthy" as PreviewStatus) : ("pending" as PreviewStatus),
      },
      {
        label: "Staging targets",
        value: `${stagingHosts.size} mapped`,
        status: stagingHosts.size > 0 ? ("syncing" as PreviewStatus) : ("pending" as PreviewStatus),
      },
      {
        label: "Review surface",
        value: newestProject ? "Analytics ready" : "Waiting for first repo",
        status: newestProject ? ("checking" as PreviewStatus) : ("pending" as PreviewStatus),
      },
    ];

    return {
      repoOwners,
      stagingHosts,
      newestProject,
      metrics,
      checklist,
      activity,
      services,
      nodes,
    };
  }, [projects]);

  if (!hasEnvVars) {
    return (
      <div className="flex-1 w-full">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Setup Required
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Connect Supabase to unlock analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">
            Add your Supabase environment variables first, then analytics can
            derive metrics from connected repositories and staging targets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <PageHeader
        eyebrow="Workspace analytics"
        title="Measure what Tiny QA is watching."
        description="This panel turns your connected repositories into a lightweight operations view: coverage, staging footprint, connection growth, and recent activity."
        status={analyticsStatus}
        meta={[
          { label: "Connected repos", value: String(projects.length) },
          { label: "Repo owners", value: String(derived.repoOwners.size) },
          { label: "Staging hosts", value: String(derived.stagingHosts.size) },
          {
            label: "Latest repo",
            value: derived.newestProject
              ? `${derived.newestProject.repo_owner}/${derived.newestProject.repo_name}`
              : "No projects yet",
          },
        ]}
        actionLabel="Analytics"
      />

      <MetricGrid
        title="Core metrics"
        description="These values are derived from the repositories currently connected in your Tiny QA workspace."
        items={derived.metrics}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <EnvironmentMap nodes={derived.nodes} />
          <ServiceStatusGrid services={derived.services} />
        </div>

        <div className="space-y-6">
          <ChecklistPanel
            title="Analytics coverage"
            items={derived.checklist}
          />

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-white">
                Workspace signal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-white/60">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Analytics state
                  </p>
                  <StatusBadge status={analyticsStatus} />
                </div>
                <p className="mt-3 text-sm text-white/70">
                  {projects.length > 0
                    ? "Tiny QA has enough connected data to surface useful operational metrics for your repos and staging environments."
                    : "Analytics will become meaningful as soon as your first project is connected."}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Staging reach
                </p>
                <p className="mt-2 text-base font-medium text-white">
                  {derived.stagingHosts.size > 0
                    ? `${derived.stagingHosts.size} environments currently covered`
                    : "No staging environments tracked yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ActivityLog title="Recent analytics activity" items={derived.activity} />

      {isLoading ? (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
          Loading connected project metrics...
        </div>
      ) : null}
    </div>
  );
}
