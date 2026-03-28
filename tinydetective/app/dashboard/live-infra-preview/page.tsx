import { LiveInfraPreviewPanel } from "@/components/preview/live-infra-preview-panel";
import { redirect } from "next/navigation";

export default function LiveInfraPreviewPage() {
  return <LiveInfraPreviewPanel />;
  export default async function LegacyLiveInfraPreviewPage({
    searchParams,
  }: {
    searchParams: Promise<{ project_id?: string }>;
  }) {
    const params = await searchParams;
    const target = params.project_id
      ? `/dashboard/live-preview?project_id=${params.project_id}`
      : "/dashboard/live-preview";
    redirect(target);
  }
