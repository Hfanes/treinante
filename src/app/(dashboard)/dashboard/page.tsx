import { PageShell } from "@/components/layout/page-shell";
import { DashboardRunsClient } from "@/components/runs/dashboard-runs-client";
import { createServerClient } from "@/lib/supabase-server";
import type { PersonalRecord, Profile, Run } from "@/types";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const [{ data: runs }, { data: profile }, { data: personalRecords }] =
    await Promise.all([
      supabase.from("runs").select("*").order("date", { ascending: false }),
      supabase
        .from("profiles")
        .select(
          "id,name,weekly_km_goal,max_hr,lthr,hr_zone_method,ftp_pace,strava_connected"
        )
        .single(),
      supabase
        .from("personal_records")
        .select("run_id,type")
        .not("run_id", "is", null),
    ]);
  const initialRuns = (runs ?? []) as unknown as Run[];
  const currentPrRecords = (personalRecords ?? []) as Pick<
    PersonalRecord,
    "run_id" | "type"
  >[];
  const initialProfile = profile as Pick<
    Profile,
    | "id"
    | "name"
    | "weekly_km_goal"
    | "max_hr"
    | "lthr"
    | "hr_zone_method"
    | "ftp_pace"
    | "strava_connected"
  > | null;

  return (
    <PageShell title="Dashboard">
      <DashboardRunsClient
        currentPrRecords={currentPrRecords}
        initialRuns={initialRuns}
        profile={initialProfile}
      />
    </PageShell>
  );
}
