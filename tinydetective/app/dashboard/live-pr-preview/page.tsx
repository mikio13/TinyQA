import { LivePrPreviewPanel } from "@/components/preview/live-pr-preview-panel";
import { redirect } from "next/navigation";

export default async function LegacyLivePrPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  const target = params.project_id
    ? `/dashboard/live-preview?project_id=${params.project_id}`
    : "/dashboard/live-preview";
  redirect(target);
  export default function LivePrPreviewPage() {
    return <LivePrPreviewPanel />;
  }
