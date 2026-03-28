import { LivePreviewClient } from "./live-preview-client";

export default async function LivePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  return <LivePreviewClient initialProjectId={params.project_id ?? null} />;
}
