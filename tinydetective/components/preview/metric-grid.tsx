import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MetricItem } from "@/lib/mock/live-preview-data";

interface MetricGridProps {
  title: string;
  description: string;
  items: MetricItem[];
}

export function MetricGrid({
  title,
  description,
  items,
}: MetricGridProps) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
