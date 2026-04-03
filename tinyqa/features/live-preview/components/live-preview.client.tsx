"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  chooseActiveRun,
  getResultText,
  type TinyFishEvent,
} from "@/features/live-preview/lib/live-preview-helpers";
import { createClient } from "@/lib/supabase/client";
import type { Project, RunRecord } from "@/types/domain";
import {
  BrowserFeedCard,
  ManualFallbackCard,
  ObserverControlsCard,
} from "./live-preview-sections";

export function LivePreviewClient({
  initialProjectId,
}: {
  initialProjectId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId
  );
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isStartingManual, setIsStartingManual] = useState(false);
  const [manualGoal, setManualGoal] = useState(
    "Open the staging site, walk through the primary user flow, and verify the latest expected PR behavior is visible."
  );
  const [manualProfile, setManualProfile] = useState<"lite" | "stealth">("stealth");
  const [manualError, setManualError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const activeRun = useMemo(() => chooseActiveRun(runs), [runs]);
  const mode =
    activeRun?.source === "webhook" ? "following webhook run" : "manual run";
  const streamingUrl = activeRun?.streaming_url ?? null;
  const waitingForStream =
    Boolean(activeRun) &&
    !streamingUrl &&
    ["queued", "running"].includes(activeRun?.status ?? "");

  useEffect(() => {
    async function loadProjects() {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      const projectList = (data ?? []) as Project[];
      setProjects(projectList);

      if (!initialProjectId && projectList[0]) {
        setSelectedProjectId(projectList[0].id);
      }
      setIsLoadingProjects(false);
    }

    loadProjects();
  }, [initialProjectId, supabase]);

  useEffect(() => {
    if (!selectedProjectId) return;
    router.replace(`/dashboard/live-preview?project_id=${selectedProjectId}`);
  }, [router, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setRuns([]);
      setIsLoadingRuns(false);
      return;
    }

    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchRuns = async () => {
      const response = await fetch(`/api/runs?project_id=${selectedProjectId}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) return;
      if (!disposed) {
        setRuns(payload.runs ?? []);
        setIsLoadingRuns(false);
      }
    };

    fetchRuns();
    interval = setInterval(fetchRuns, 3000);

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
    };
  }, [selectedProjectId]);

  async function handleStartManualRun() {
    if (!selectedProject) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStartingManual(true);
    setManualError(null);

    try {
      const response = await fetch("/api/live-preview/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject.id,
          url: selectedProject.staging_url,
          goal: manualGoal,
          browser_profile: manualProfile,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to start manual live preview.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.trim().startsWith("data:"));
          if (!dataLine) continue;

          const rawPayload = dataLine.replace(/^data:\s*/, "").trim();
          if (!rawPayload) continue;

          let event: TinyFishEvent;
          try {
            event = JSON.parse(rawPayload) as TinyFishEvent;
          } catch {
            continue;
          }

          if (event.type === "ERROR") {
            setManualError(event.error ?? "TinyFish reported an error.");
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setManualError(
          error instanceof Error ? error.message : "Unable to start manual run."
        );
      }
    } finally {
      setIsStartingManual(false);
    }
  }

  function handleStopManualRun() {
    abortRef.current?.abort();
    setIsStartingManual(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Live Preview</h1>
        <p className="text-sm text-white/50">
          Hybrid observer mode: auto-follow active webhook runs, or start a manual run when idle.
        </p>
      </div>

      <ObserverControlsCard
        projects={projects}
        selectedProjectId={selectedProjectId}
        isLoadingProjects={isLoadingProjects}
        mode={mode}
        activeRun={activeRun}
        manualError={manualError}
        onSelectProject={setSelectedProjectId}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.95fr]">
        <BrowserFeedCard
          isLoadingRuns={isLoadingRuns}
          streamingUrl={streamingUrl}
          waitingForStream={waitingForStream}
          selectedProject={selectedProject}
        />
        <ManualFallbackCard
          manualGoal={manualGoal}
          manualProfile={manualProfile}
          isStartingManual={isStartingManual}
          selectedProject={selectedProject}
          currentResult={getResultText(activeRun)}
          onGoalChange={setManualGoal}
          onProfileChange={setManualProfile}
          onStart={handleStartManualRun}
          onStop={handleStopManualRun}
        />
      </div>
    </div>
  );
}
