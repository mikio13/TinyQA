"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project, RunRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Play, Square } from "lucide-react";

type TinyFishEvent = {
  type?: string;
  run_id?: string;
  streaming_url?: string;
  result?: unknown;
  error?: string;
  status?: string;
};

function chooseActiveRun(runs: RunRecord[]): RunRecord | null {
  const active = runs.filter((run) => run.status === "queued" || run.status === "running");
  if (active.length === 0) {
    return null;
  }
  const webhookRun = active.find((run) => run.source === "webhook");
  return webhookRun ?? active[0];
}

function getResultText(run: RunRecord | null): string {
  if (!run) return "No active run.";
  return run.result_text ?? run.failure_reason ?? "Waiting for result...";
}

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

      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-white">Observer Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                Project
              </label>
              <select
                value={selectedProjectId ?? ""}
                onChange={(event) => setSelectedProjectId(event.target.value || null)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                disabled={isLoadingProjects}
              >
                {isLoadingProjects ? (
                  <option value="">Loading projects...</option>
                ) : projects.length === 0 ? (
                  <option value="">No projects found</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.repo_owner}/{project.repo_name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
              <p className="font-bold uppercase tracking-wider text-white/40">Mode</p>
              <p className="mt-1 text-sm text-white">{mode}</p>
              {activeRun ? (
                <p className="mt-1">
                  Active run: <span className="text-white/80">{activeRun.status}</span>
                </p>
              ) : (
                <p className="mt-1">No active run</p>
              )}
            </div>
          </div>

          {manualError ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {manualError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.95fr]">
        <Card className="overflow-hidden border-white/10 bg-white/5">
          <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
            <CardTitle className="text-base text-white">Live browser feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {isLoadingRuns ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/40">
                Loading run state...
              </div>
            ) : streamingUrl ? (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1E2638]">
                <div className="border-b border-white/10 bg-white/5 px-5 py-3 text-xs text-white/40">
                  {streamingUrl}
                </div>
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={streamingUrl}
                    title="TinyFish Live Stream"
                    className="h-full w-full border-0"
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg border border-white/10 bg-[#1E2638] p-8 text-center">
                <div className="max-w-md space-y-3">
                  <p className="text-sm font-bold uppercase tracking-wider text-white/40">
                    {waitingForStream ? "Waiting for STREAMING_URL" : "Idle"}
                  </p>
                  <h3 className="text-2xl font-semibold text-white">
                    {selectedProject
                      ? `${selectedProject.repo_owner}/${selectedProject.repo_name}`
                      : "Select a project"}
                  </h3>
                  <p className="text-sm leading-7 text-white/60">
                    {waitingForStream
                      ? "A run is active but the browser stream has not arrived yet. This page will auto-attach once TinyFish emits STREAMING_URL."
                      : "When a webhook run starts, this page auto-follows it. You can also start a manual run below."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-white">Manual fallback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                Goal
              </label>
              <textarea
                value={manualGoal}
                onChange={(event) => setManualGoal(event.target.value)}
                rows={5}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/40"
                disabled={!selectedProject}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                Browser profile
              </label>
              <select
                value={manualProfile}
                onChange={(event) =>
                  setManualProfile(event.target.value as "lite" | "stealth")
                }
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                disabled={!selectedProject}
              >
                <option value="lite">lite</option>
                <option value="stealth">stealth</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleStartManualRun}
                disabled={isStartingManual || !selectedProject}
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                {isStartingManual ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {isStartingManual ? "Starting..." : "Start Manual Run"}
              </Button>
              <Button
                onClick={handleStopManualRun}
                disabled={!isStartingManual}
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Square className="size-4" />
                Stop
              </Button>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/50">
              <p className="font-bold uppercase tracking-wider text-white/35">Current result</p>
              <p className="mt-2 whitespace-pre-wrap">{getResultText(activeRun)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
