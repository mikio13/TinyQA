"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, RunRecord } from "@/types/domain";
import { LoaderCircle, Play, Square } from "lucide-react";

export function ObserverControlsCard({
  projects,
  selectedProjectId,
  isLoadingProjects,
  mode,
  activeRun,
  manualError,
  onSelectProject,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  isLoadingProjects: boolean;
  mode: string;
  activeRun: RunRecord | null;
  manualError: string | null;
  onSelectProject: (projectId: string | null) => void;
}) {
  return (
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
              onChange={(event) => onSelectProject(event.target.value || null)}
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
  );
}

export function BrowserFeedCard({
  isLoadingRuns,
  streamingUrl,
  waitingForStream,
  selectedProject,
}: {
  isLoadingRuns: boolean;
  streamingUrl: string | null;
  waitingForStream: boolean;
  selectedProject: Project | null;
}) {
  return (
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
  );
}

export function ManualFallbackCard({
  manualGoal,
  manualProfile,
  isStartingManual,
  selectedProject,
  currentResult,
  onGoalChange,
  onProfileChange,
  onStart,
  onStop,
}: {
  manualGoal: string;
  manualProfile: "lite" | "stealth";
  isStartingManual: boolean;
  selectedProject: Project | null;
  currentResult: string;
  onGoalChange: (goal: string) => void;
  onProfileChange: (profile: "lite" | "stealth") => void;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
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
            onChange={(event) => onGoalChange(event.target.value)}
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
            onChange={(event) => onProfileChange(event.target.value as "lite" | "stealth")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
            disabled={!selectedProject}
          >
            <option value="lite">lite</option>
            <option value="stealth">stealth</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onStart}
            disabled={isStartingManual || !selectedProject}
            className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            {isStartingManual ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {isStartingManual ? "Starting..." : "Start Manual Run"}
          </Button>
          <Button
            onClick={onStop}
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
          <p className="mt-2 whitespace-pre-wrap">{currentResult}</p>
        </div>
      </CardContent>
    </Card>
  );
}
