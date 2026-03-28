"use client";

import { LivePreviewRunner } from "@/components/preview/live-preview-runner";

export function LiveInfraPreviewPanel() {
  return (
    <LivePreviewRunner
      template={{
        eyebrow: "Live browser preview for Supabase and AWS",
        title: "Validate that infra-backed changes are actually live.",
        description:
          "This page starts a real TinyFish live run against the deployed environment, waits for the streaming browser URL, and lets the team watch whether backend-connected changes are reflected in the preview.",
        previewLabel: "Infra live browser feed",
        scenarioLabel: "Supabase and AWS environment check",
        repository: "tinyfish-ai/tinydetective",
        branch: "infra/preview-sync-check",
        author: "Platform and backend",
        lastUpdated: "Live",
        defaultUrl: "https://infra-preview.tinyfish.app",
        defaultGoal:
          "Open the staging environment, confirm the app loads successfully, verify the deployed environment is using the expected Supabase and AWS-backed preview setup, and report whether the latest infra-linked changes appear in the UI flow.",
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
