import { PageShell } from "@/components/layout/page-shell";
import { RunListClient } from "@/components/runs/run-list-client";
import { createServerClient } from "@/lib/supabase-server";
import type { Run } from "@/types";

async function getInitialRuns() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("runs")
    .select("*")
    .order("date", { ascending: false })
    .limit(100);

  return (data ?? []) as unknown as Run[];
}

export default async function RunsPage() {
  const initialRuns = await getInitialRuns();

  return (
    <PageShell title="Runs">
      <RunListClient initialRuns={initialRuns} />
    </PageShell>
  );
}
