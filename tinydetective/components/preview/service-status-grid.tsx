import { StatusBadge } from "@/components/preview/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InfraServiceStatus } from "@/lib/mock/live-preview-data";

interface ServiceStatusGridProps {
  services: InfraServiceStatus[];
}

export function ServiceStatusGrid({ services }: ServiceStatusGridProps) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/10 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Service readiness</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.name}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{service.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {service.provider}
                </p>
              </div>
              <StatusBadge status={service.state} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {service.detail}
            </p>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Latency
              </span>
              <span className="text-sm font-medium text-white">
                {service.latency}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
