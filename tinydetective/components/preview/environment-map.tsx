import { StatusBadge } from "@/components/preview/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewStatus } from "@/lib/mock/live-preview-data";

interface NodeConfig {
  label: string;
  value: string;
  status: PreviewStatus;
}

interface EnvironmentMapProps {
  nodes: NodeConfig[];
}

export function EnvironmentMap({ nodes }: EnvironmentMapProps) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/10 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Environment sync map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-3">
          {nodes.map((node, index) => (
            <div key={node.label} className="relative">
              {index < nodes.length - 1 ? (
                <div className="absolute right-[-0.75rem] top-1/2 hidden h-px w-6 bg-cyan-400/30 xl:block" />
              ) : null}
              <div className="h-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.86)_0%,_rgba(2,6,23,0.92)_100%)] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {node.label}
                </p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {node.value}
                </p>
                <div className="mt-4">
                  <StatusBadge status={node.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
