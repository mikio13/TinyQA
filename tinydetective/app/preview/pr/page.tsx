import { redirect } from "next/navigation";

export default async function PreviewPrPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  const target = params.project_id
    ? `/dashboard/live-pr-preview?project_id=${params.project_id}`
    : "/dashboard/live-pr-preview";
  redirect(target);
}
