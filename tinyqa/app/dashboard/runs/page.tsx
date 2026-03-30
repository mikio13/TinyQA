"use client";

import { useEffect, useState } from "react";
import type { RunRecord } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const statusStyles: Record<string, string> = {
  passed: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10",
  failed: "text-red-300 border-red-500/20 bg-red-500/10",
  error: "text-red-300 border-red-500/20 bg-red-500/10",
  timed_out: "text-amber-300 border-amber-500/20 bg-amber-500/10",
  running: "text-cyan-300 border-cyan-500/20 bg-cyan-500/10",
  queued: "text-white/70 border-white/15 bg-white/5",
};

function MarkdownResult({ content }: { content: string }) {
  return (
    <div className="mt-2 space-y-2 text-sm text-white/75">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-base font-semibold text-white" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-sm font-semibold text-white" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-sm font-semibold text-white" {...props} />
          ),
          p: ({ ...props }) => <p className="leading-6 text-white/75" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc space-y-1 pl-5" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal space-y-1 pl-5" {...props} />,
          li: ({ ...props }) => <li className="text-white/75" {...props} />,
          a: ({ ...props }) => (
            <a
              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: ({ ...props }) => (
            <code
              className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-cyan-200"
              {...props}
            />
          ),
          pre: ({ ...props }) => (
            <pre
              className="overflow-x-auto rounded-lg border border-white/10 bg-[#131a29] p-3 text-xs text-cyan-100"
              {...props}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-2 border-white/20 pl-3 italic text-white/60"
              {...props}
            />
          ),
          hr: ({ ...props }) => <hr className="border-white/10" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function DashboardRunsPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const response = await fetch("/api/runs", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load run records.");
        }

        setRuns(payload.runs ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load run records."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchRuns();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Run Records</h1>
        <p className="text-sm text-white/50">
          Every webhook-triggered and manual TinyFish run recorded in one place.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/40">
          Loading run records...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-white/40">
          No run records yet. Trigger a webhook or start a live preview to populate this page.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div
              key={run.id}
              className="rounded-lg border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {run.repo_full_name}
                    {run.pr_number ? ` · PR #${run.pr_number}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {run.pr_title ?? "Manual live preview run"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[run.status] ?? statusStyles.queued}`}
                >
                  {run.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Goal
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {run.goal ?? "Goal not stored yet."}
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Result
                  </p>
                  <MarkdownResult
                    content={
                      run.result_text ??
                      run.failure_reason ??
                      "No final result yet."
                    }
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/35">
                <span>Source: {run.source}</span>
                <span>Created: {new Date(run.created_at).toLocaleString("en-SG")}</span>
                {run.completed_at ? (
                  <span>Completed: {new Date(run.completed_at).toLocaleString("en-SG")}</span>
                ) : null}
                {run.review_comment_url ? (
                  <a
                    href={run.review_comment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 hover:text-white"
                  >
                    Open PR comment
                  </a>
                ) : null}
                {run.screenshot_url ? (
                  <a
                    href={run.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 hover:text-white"
                  >
                    Open screenshot
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
