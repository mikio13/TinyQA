import { createClient } from "@/lib/supabase/server";
import { LivePreviewRunner } from "@/components/preview/live-preview-runner";
import type { Project } from "@/lib/types";

export default async function LivePrPreviewPage({
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
        eyebrow: "Live browser preview for pull requests",
        title: "Watch TinyFish verify the fix inside the PR preview.",
        description:
          "This page now starts a real TinyFish live run, waits for the STREAMING_URL event, and embeds the browser feed so reviewers can see whether the fix is actually visible in the preview environment.",
        previewLabel: "PR live browser feed",
        scenarioLabel: "PR verification run",
        repository:
          selectedProject
            ? `${selectedProject.repo_owner}/${selectedProject.repo_name}`
            : "Select a project from the dashboard",
        branch: selectedProject ? "Selected project staging" : "No project selected",
        author: selectedProject?.repo_owner ?? "TinyDetective",
        lastUpdated: "Live",
        defaultUrl: selectedProject?.staging_url ?? "https://preview-pr-214.tinyfish.app",
        defaultGoal:
          selectedProject
            ? `Open ${selectedProject.staging_url}, verify the most important pull request flow, and confirm the UI visibly reflects the intended change.`
            : "Open the pull request preview, verify the checkout success toast disappears after completion, and confirm the mobile sticky footer CTA is aligned correctly on a narrow viewport.",
        browserProfile: "stealth",
        checksTitle: "TinyFish checklist",
        checklist: [
          {
            id: "streaming-url",
            title: "Live browser stream is attached to this PR run",
            detail:
              "The iframe should switch from placeholder state as soon as TinyFish emits STREAMING_URL.",
            state: "pending",
          },
          {
            id: "flow-progress",
            title: "TinyFish is walking through the PR verification flow",
            detail:
              "Progress events should describe the sequence TinyFish is performing inside the preview.",
            state: "pending",
          },
          {
            id: "completion",
            title: "Final result lands after the live browser run completes",
            detail:
              "The run summary should show the final COMPLETE payload once TinyFish finishes.",
            state: "pending",
          },
        ],
      }}
    />
  );
}
