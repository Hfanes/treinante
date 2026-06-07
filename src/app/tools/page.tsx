import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui";

export default function ToolsPage() {
  return (
    <PageShell title="Training Tools">
      <Card subtitle="Public calculators will be implemented from PRD 11.">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Pace, gel timing, hill gradient, and Zone 2 tools.
        </p>
      </Card>
    </PageShell>
  );
}
