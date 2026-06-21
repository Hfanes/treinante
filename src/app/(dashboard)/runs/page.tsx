import { PageShell } from "@/components/layout/page-shell";
import { RunListClient } from "@/components/runs/run-list-client";
import { createServerClient } from "@/lib/supabase-server";
import type { PersonalRecord, Run } from "@/types";

interface RunsPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}

async function getRunsPageData(filters: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await createServerClient();
  let runsQuery = supabase.from("runs").select("*").order("date", {
    ascending: false,
  });

  if (filters.dateFrom) runsQuery = runsQuery.gte("date", filters.dateFrom);
  if (filters.dateTo) runsQuery = runsQuery.lte("date", filters.dateTo);

  const [{ data: runs }, { data: personalRecords }] = await Promise.all([
    runsQuery,
    supabase
      .from("personal_records")
      .select("run_id,type")
      .not("run_id", "is", null),
  ]);

  return {
    currentPrRecords: (personalRecords ?? []) as Pick<
      PersonalRecord,
      "run_id" | "type"
    >[],
    initialRuns: (runs ?? []) as unknown as Run[],
  };
}

export default async function RunsPage({ searchParams }: RunsPageProps) {
  const { currentPrRecords, initialRuns } = await getRunsPageData(
    await searchParams
  );

  return (
    <PageShell title="Runs">
      <RunListClient
        currentPrRecords={currentPrRecords}
        initialRuns={initialRuns}
      />
    </PageShell>
  );
}
