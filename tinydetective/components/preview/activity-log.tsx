import { StatusBadge } from "@/components/preview/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewActivityItem } from "@/lib/mock/live-preview-data";

interface ActivityLogProps {
  title: string;
  items: PreviewActivityItem[];
}

export function ActivityLog({ title, items }: ActivityLogProps) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
              {index < items.length - 1 ? (
                <span className="mt-2 h-full w-px bg-white/10" />
              ) : null}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                    {item.time}
                  </p>
                  <StatusBadge status={item.state} />
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
