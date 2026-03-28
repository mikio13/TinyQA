import { DashboardSheet } from "@/components/dashboard/dashboard-sheet";
import { DashboardProjectsPanel } from "@/components/dashboard/projects-panel";

export default function DashboardModalPage() {
  return (
    <DashboardSheet>
      <DashboardProjectsPanel />
    </DashboardSheet>
  );
}
