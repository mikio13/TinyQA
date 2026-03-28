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
        "overflow-hidden rounded-lg border border-white/10 bg-white/5 p-6 sm:p-8",
        className
      )}
    >
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-white/60">
              <Sparkles className="size-3.5" />
              {eyebrow}
            </span>
            <StatusBadge status={status} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/50">
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
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
