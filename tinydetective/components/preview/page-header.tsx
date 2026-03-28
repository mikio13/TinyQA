import { StatusBadge } from "@/components/preview/status-badge";
import { Button } from "@/components/ui/button";
import type { PreviewStatus } from "@/lib/mock/live-preview-data";
import { cn } from "@/lib/utils";
import { ExternalLink, Sparkles } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  status: PreviewStatus;
  meta: Array<{ label: string; value: string }>;
  actionLabel?: string;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  meta,
  actionLabel = "Open Preview",
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] p-6 shadow-2xl shadow-cyan-950/10 sm:p-8",
        className
      )}
    >
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="size-3.5" />
              {eyebrow}
            </span>
            <StatusBadge status={status} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <ExternalLink className="size-4" />
          {actionLabel}
        </Button>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {meta.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
