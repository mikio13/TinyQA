"use client";

import { LivePreviewRunner } from "@/components/preview/live-preview-runner";

export function LivePrPreviewPanel() {
  return (
    <LivePreviewRunner
      template={{
        eyebrow: "Live browser preview for pull requests",
        title: "Watch TinyFish verify the fix inside the PR preview.",
        description:
          "This page now starts a real TinyFish live run, waits for the STREAMING_URL event, and embeds the browser feed so reviewers can see whether the fix is actually visible in the preview environment.",
        previewLabel: "PR live browser feed",
        scenarioLabel: "PR verification run",
        repository: "tinyfish-ai/tinydetective",
        branch: "feat/fix-resolution-checker",
        author: "Alicia Tan",
        lastUpdated: "Live",
        defaultUrl: "https://preview-pr-214.tinyfish.app",
        defaultGoal:
          "Open the pull request preview, verify the checkout success toast disappears after completion, and confirm the mobile sticky footer CTA is aligned correctly on a narrow viewport.",
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
