import { redirect } from "next/navigation";

export default async function PreviewInfraPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  const target = params.project_id
    ? `/dashboard/live-infra-preview?project_id=${params.project_id}`
    : "/dashboard/live-infra-preview";
  redirect(target);
}
