import { PageShell } from "@/components/layout/page-shell";
import { RunListClient } from "@/components/runs/run-list-client";
import { createServerClient } from "@/lib/supabase-server";
import type { PersonalRecord, Run } from "@/types";

async function getRunsPageData() {
  const supabase = await createServerClient();
  const [{ data: runs }, { data: personalRecords }] = await Promise.all([
    supabase.from("runs").select("*").order("date", { ascending: false }),
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

export default async function RunsPage() {
  const { currentPrRecords, initialRuns } = await getRunsPageData();

  return (
    <PageShell title="Runs">
      <RunListClient
        currentPrRecords={currentPrRecords}
        initialRuns={initialRuns}
      />
    </PageShell>
  );
}
