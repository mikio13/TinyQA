import { StatusBadge } from "@/components/preview/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewStatus } from "@/lib/mock/live-preview-data";
import { ExternalLink, RefreshCw, SplitSquareVertical } from "lucide-react";

interface PreviewAnnotation {
  label: string;
  detail: string;
  align?: "left" | "right";
}

interface LiveBrowserFrameProps {
  title: string;
  url: string;
  status: PreviewStatus;
  headline: string;
  summary: string;
  annotations: PreviewAnnotation[];
}

export function LiveBrowserFrame({
  title,
  url,
  status,
  headline,
  summary,
  annotations,
}: LiveBrowserFrameProps) {
  return (
    <Card className="overflow-hidden border-white/10 bg-slate-950/80 shadow-2xl shadow-cyan-950/20">
      <CardHeader className="border-b border-white/10 bg-slate-950/90 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white">{title}</CardTitle>
            <p className="mt-2 text-sm text-slate-400">{url}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              <ExternalLink className="size-4" />
              Open Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              <RefreshCw className="size-4" />
              Re-run Check
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              <SplitSquareVertical className="size-4" />
              Compare
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-white/10 bg-slate-900/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <div className="ml-3 flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-slate-400">
              {url}
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.24),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)] p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-cyan-950/10 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} label="Live inspection" />
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                  Browser preview
                </span>
              </div>
              <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white">
                {headline}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                {summary}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">
                    Resolved signal
                  </p>
                  <p className="mt-3 text-lg font-medium text-white">
                    Checkout confirmation state renders correctly.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-200">
                    Needs review
                  </p>
                  <p className="mt-3 text-lg font-medium text-white">
                    Minor footer spacing shift still visible on smaller screens.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Viewport capture
                </p>
                <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/90 p-4">
                  <div className="space-y-3">
                    <div className="h-4 w-28 rounded-full bg-white/10" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10" />
                      <div className="h-24 rounded-2xl bg-white/5" />
                    </div>
                    <div className="h-32 rounded-3xl border border-dashed border-cyan-400/20 bg-cyan-400/5" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="h-16 rounded-2xl bg-white/5" />
                      <div className="h-16 rounded-2xl bg-white/5" />
                      <div className="h-16 rounded-2xl bg-white/5" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Live annotations
                </p>
                <div className="mt-4 space-y-3">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.label}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">
                          {annotation.label}
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                          {annotation.align ?? "left"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {annotation.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
