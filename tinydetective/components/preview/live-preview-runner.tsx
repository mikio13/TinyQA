"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityLog } from "@/components/preview/activity-log";
import { ChecklistPanel } from "@/components/preview/checklist-panel";
import { MetricGrid } from "@/components/preview/metric-grid";
import { PageHeader } from "@/components/preview/page-header";
import { StatusBadge } from "@/components/preview/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PreviewActivityItem,
  PreviewChecklistItem,
  PreviewStatus,
} from "@/lib/mock/live-preview-data";
import { ExternalLink, LoaderCircle, Play, Square } from "lucide-react";

type TinyFishEventType =
  | "STARTED"
  | "STREAMING_URL"
  | "PROGRESS"
  | "COMPLETE"
  | "ERROR"
  | "HEARTBEAT";

interface TinyFishStreamEvent {
  type: TinyFishEventType;
  run_id?: string;
  streaming_url?: string;
  purpose?: string;
  result?: unknown;
  status?: string;
  error?: string;
  timestamp?: string;
}

interface PreviewTemplate {
  eyebrow: string;
  title: string;
  description: string;
  previewLabel: string;
  scenarioLabel: string;
  repository: string;
  branch: string;
  author: string;
  lastUpdated: string;
  defaultUrl: string;
  defaultGoal: string;
  browserProfile: "lite" | "stealth";
  checksTitle: string;
  checklist: PreviewChecklistItem[];
}

interface LivePreviewRunnerProps {
  template: PreviewTemplate;
}

function buildTimestampLabel(timestamp?: string) {
  if (!timestamp) {
    return "Live";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Live";
  }

  return date.toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventToActivity(event: TinyFishStreamEvent, fallbackId: string) {
  const shared = {
    id: `${fallbackId}-${event.timestamp ?? "live"}`,
    time: buildTimestampLabel(event.timestamp),
  };

  switch (event.type) {
    case "STARTED":
      return {
        ...shared,
        label: "TinyFish automation started",
        detail: `Run ${event.run_id ?? "pending"} is now live.`,
        state: "checking" as PreviewStatus,
      };
    case "STREAMING_URL":
      return {
        ...shared,
        label: "Live browser stream ready",
        detail: "TinyFish returned a streaming URL. The iframe is now showing the browser session.",
        state: "passed" as PreviewStatus,
      };
    case "PROGRESS":
      return {
        ...shared,
        label: "Verification step in progress",
        detail: event.purpose ?? "TinyFish is moving through the requested browser workflow.",
        state: "checking" as PreviewStatus,
      };
    case "COMPLETE":
      return {
        ...shared,
        label: "Automation completed",
        detail:
          typeof event.result === "string"
            ? event.result
            : "TinyFish completed the run and returned a final result payload.",
        state:
          event.status === "FAILED"
            ? ("failed" as PreviewStatus)
            : ("passed" as PreviewStatus),
      };
    case "ERROR":
      return {
        ...shared,
        label: "Automation failed",
        detail: event.error ?? "TinyFish reported an error while running the preview.",
        state: "failed" as PreviewStatus,
      };
    default:
      return null;
  }
}

function computeStatus({
  hasError,
  hasStreamingUrl,
  isRunning,
  isComplete,
}: {
  hasError: boolean;
  hasStreamingUrl: boolean;
  isRunning: boolean;
  isComplete: boolean;
}): PreviewStatus {
  if (hasError) {
    return "failed";
  }

  if (isComplete) {
    return "passed";
  }

  if (hasStreamingUrl) {
    return "checking";
  }

  if (isRunning) {
    return "pending";
  }

  return "pending";
}

export function LivePreviewRunner({ template }: LivePreviewRunnerProps) {
  const [targetUrl, setTargetUrl] = useState(template.defaultUrl);
  const [goal, setGoal] = useState(template.defaultGoal);
  const [browserProfile, setBrowserProfile] = useState<"lite" | "stealth">(
    template.browserProfile
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [events, setEvents] = useState<PreviewActivityItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const status = computeStatus({
    hasError: Boolean(errorText),
    hasStreamingUrl: Boolean(streamingUrl),
    isRunning,
    isComplete,
  });

  const checklist = useMemo(() => {
    if (errorText) {
      return template.checklist.map((item) => ({
        ...item,
        state: item.state === "passed" ? "warning" : item.state,
      }));
    }

    if (!runId) {
      return template.checklist;
    }

    return template.checklist.map((item, index) => {
      if (isComplete) {
        return {
          ...item,
          state: index === 0 ? "passed" : item.state === "pending" ? "passed" : item.state,
        };
      }

      if (streamingUrl && index === 0) {
        return { ...item, state: "passed" as PreviewStatus };
      }

      if (isRunning && index === 1) {
        return { ...item, state: "checking" as PreviewStatus };
      }

      return item;
    });
  }, [errorText, isComplete, isRunning, runId, streamingUrl, template.checklist]);

  const metrics = useMemo(
    () => [
      { label: "Run state", value: status === "pending" ? "Idle" : status },
      { label: "Run ID", value: runId ?? "Not started" },
      { label: "Browser feed", value: streamingUrl ? "Connected" : "Waiting" },
      { label: "Profile", value: browserProfile.toUpperCase() },
    ],
    [browserProfile, runId, status, streamingUrl]
  );

  async function startRun() {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setRunId(null);
    setStreamingUrl(null);
    setResultText(null);
    setErrorText(null);
    setEvents([]);
    setIsComplete(false);
    setIsRunning(true);

    const response = await fetch("/api/live-preview/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        goal,
        browser_profile: browserProfile,
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => null);
      throw new Error(
        payload?.error ?? "Unable to start TinyFish live preview."
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const dataLine = chunk
          .split("\n")
          .find((line) => line.trim().startsWith("data:"));

        if (!dataLine) {
          continue;
        }

        const rawPayload = dataLine.replace(/^data:\s*/, "").trim();

        if (!rawPayload) {
          continue;
        }

        let event: TinyFishStreamEvent;

        try {
          event = JSON.parse(rawPayload) as TinyFishStreamEvent;
        } catch {
          continue;
        }

        if (event.run_id) {
          setRunId(event.run_id);
        }

        if (event.type === "STREAMING_URL" && event.streaming_url) {
          setStreamingUrl(event.streaming_url);
        }

        if (event.type === "COMPLETE") {
          setIsComplete(true);
          setIsRunning(false);
          setResultText(
            typeof event.result === "string"
              ? event.result
              : JSON.stringify(event.result, null, 2)
          );
        }

        if (event.type === "ERROR") {
          setErrorText(event.error ?? "TinyFish reported an error.");
          setIsRunning(false);
        }

        const activity = eventToActivity(event, event.type.toLowerCase());

        if (activity) {
          setEvents((current) => [activity, ...current].slice(0, 10));
        }
      }
    }
  }

  async function handleStart() {
    try {
      await startRun();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setIsRunning(false);
      setErrorText(
        error instanceof Error ? error.message : "Unable to start live preview."
      );
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setIsRunning(false);
    setEvents((current) => [
      {
        id: `stopped-${Date.now()}`,
        label: "Run stopped locally",
        detail: "The browser preview stream was closed from the frontend.",
        time: buildTimestampLabel(),
        state: "warning",
      },
      ...current,
    ]);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="space-y-6 pb-4">
        <PageHeader
          eyebrow={template.eyebrow}
          title={template.title}
          description={template.description}
          status={status}
          meta={[
            { label: "Repository", value: template.repository },
            { label: "Branch", value: template.branch },
            { label: "Owner", value: template.author },
            { label: "Last updated", value: template.lastUpdated },
          ]}
          actionLabel="Open live stream"
        />

        <MetricGrid
          title="Live run status"
          description="These values now reflect the TinyFish run you start from this page."
          items={metrics}
        />

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.95fr]">
          <Card className="overflow-hidden border-white/10 bg-white/5">
            <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-white">
                    {template.previewLabel}
                  </CardTitle>
                  <p className="mt-2 text-sm text-white/40">
                    TinyFish `run-sse` preview stream
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  {streamingUrl ? (
                    <a
                      href={streamingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        <ExternalLink className="size-4" />
                        Open Stream
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Target URL
                  </label>
                  <input
                    value={targetUrl}
                    onChange={(event) => setTargetUrl(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Browser profile
                  </label>
                  <select
                    value={browserProfile}
                    onChange={(event) =>
                      setBrowserProfile(event.target.value as "lite" | "stealth")
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    <option value="lite">lite</option>
                    <option value="stealth">stealth</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Goal
                </label>
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/40"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleStart}
                  disabled={isRunning}
                  className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
                >
                  {isRunning ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {isRunning ? "Starting…" : "Start Live Preview"}
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={!isRunning}
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Square className="size-4" />
                  Stop Stream
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1E2638]">
                <div className="border-b border-white/10 bg-white/5 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <div className="ml-3 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40">
                      {streamingUrl ?? "Waiting for STREAMING_URL event..."}
                    </div>
                  </div>
                </div>

                {streamingUrl ? (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={streamingUrl}
                      title={template.previewLabel}
                      className="h-full w-full border-0"
                      allow="clipboard-read; clipboard-write"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[#1E2638] p-8 text-center">
                    <div className="max-w-md space-y-3">
                      <StatusBadge
                        status={isRunning ? "checking" : "pending"}
                        label={isRunning ? "Waiting for stream" : "Ready to run"}
                      />
                      <h3 className="text-2xl font-semibold text-white">
                        {template.scenarioLabel}
                      </h3>
                      <p className="text-sm leading-7 text-white/60">
                        {isRunning
                          ? "TinyFish has started the automation. The iframe will switch on as soon as the STREAMING_URL event arrives."
                          : "Start a live TinyFish run to watch the browser session here in real time."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Run summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-white/60">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Scenario
                  </p>
                  <p className="mt-2 text-base font-medium text-white">
                    {template.scenarioLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Current run
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-white/70">
                    {runId ?? "Waiting for STARTED event"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Result
                  </p>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/60">
                    {errorText ?? resultText ?? "No final result yet. TinyFish will stream progress here as events arrive."}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <ChecklistPanel title={template.checksTitle} items={checklist} />
          </div>
        </div>

        <ActivityLog
          title="Live TinyFish events"
          items={
            events.length > 0
              ? events
              : [
                  {
                    id: "idle",
                    label: "No live events yet",
                    detail:
                      "Start the preview to populate this panel with TinyFish STARTED, STREAMING_URL, PROGRESS, and COMPLETE events.",
                    time: "Now",
                    state: "pending",
                  },
                ]
          }
        />
      </div>
    </div>
  );
}
