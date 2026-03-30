import { Badge } from "@/components/ui/badge";
import type { PreviewStatus } from "@/lib/mock/live-preview-data";
import { cn } from "@/lib/utils";

const statusMap: Record<
  PreviewStatus,
  { label: string; className: string; dotClassName: string }
> = {
  passed: {
    label: "Passed",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    dotClassName: "bg-emerald-400",
  },
  failed: {
    label: "Failed",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    dotClassName: "bg-rose-400",
  },
  warning: {
    label: "Warning",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    dotClassName: "bg-amber-400",
  },
  pending: {
    label: "Pending",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-300",
    dotClassName: "bg-slate-400",
  },
  checking: {
    label: "Checking",
    className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    dotClassName: "bg-cyan-400",
  },
  healthy: {
    label: "Healthy",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    dotClassName: "bg-emerald-400",
  },
  degraded: {
    label: "Degraded",
    className: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    dotClassName: "bg-orange-400",
  },
  deploying: {
    label: "Deploying",
    className: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    dotClassName: "bg-violet-400",
  },
  syncing: {
    label: "Syncing",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    dotClassName: "bg-sky-400",
  },
};

interface StatusBadgeProps {
  status: PreviewStatus;
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  const config = statusMap[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold",
        config.className,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", config.dotClassName)} />
      {label ?? config.label}
    </Badge>
  );
}
