import { StatusBadge } from "@/components/preview/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewChecklistItem } from "@/lib/mock/live-preview-data";

interface ChecklistPanelProps {
  title: string;
  items: PreviewChecklistItem[];
}

export function ChecklistPanel({ title, items }: ChecklistPanelProps) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/10 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.detail}
                </p>
              </div>
              <StatusBadge status={item.state} className="shrink-0" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
