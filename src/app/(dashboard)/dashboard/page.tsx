import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui";

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard">
      <Card subtitle="Foundation route placeholder. Feature logic comes from PRD implementation phases.">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Ready for RunMetrics data.
        </p>
      </Card>
    </PageShell>
  );
}
