import { createClient } from "@/lib/supabase/server";
import { LivePreviewRunner } from "@/components/preview/live-preview-runner";
import type { Project } from "@/lib/types";

export default async function LiveInfraPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const projectList = (projects ?? []) as Project[];
  const selectedProject =
    projectList.find((project) => project.id === params.project_id) ??
    projectList[0] ??
    null;

  return (
    <LivePreviewRunner
      template={{
        projectId: selectedProject?.id,
        eyebrow: "Live browser preview for Supabase and AWS",
        title: "Validate that infra-backed changes are actually live.",
        description:
          "This page starts a real TinyFish live run against the deployed environment, waits for the streaming browser URL, and lets the team watch whether backend-connected changes are reflected in the preview.",
        previewLabel: "Infra live browser feed",
        scenarioLabel: "Supabase and AWS environment check",
        repository:
          selectedProject
            ? `${selectedProject.repo_owner}/${selectedProject.repo_name}`
            : "Select a project from the dashboard",
        branch: selectedProject ? "Selected project staging" : "No project selected",
        author: selectedProject?.repo_owner ?? "Platform and backend",
        lastUpdated: "Live",
        defaultUrl: selectedProject?.staging_url ?? "https://infra-preview.tinyfish.app",
        defaultGoal:
          selectedProject
            ? `Open ${selectedProject.staging_url}, confirm the app loads successfully, verify infra-backed services are reachable, and report whether the latest deployed changes are visible in the UI flow.`
            : "Open the staging environment, confirm the app loads successfully, verify the deployed environment is using the expected Supabase and AWS-backed preview setup, and report whether the latest infra-linked changes appear in the UI flow.",
        browserProfile: "stealth",
        checksTitle: "Infra verification checks",
        checklist: [
          {
            id: "streaming-url",
            title: "Live browser stream is attached to the environment run",
            detail:
              "This page should embed the TinyFish streaming_url once the SSE event arrives.",
            state: "pending",
          },
          {
            id: "service-check",
            title: "TinyFish can actually navigate the deployed environment",
            detail:
              "Progress events should reflect the browser run moving through the infra-backed preview.",
            state: "pending",
          },
          {
            id: "final-result",
            title: "Final automation result is captured after the live run",
            detail:
              "The run summary should display the COMPLETE payload for this environment check.",
            state: "pending",
          },
        ],
      }}
    />
  );
}
