import { PageShell } from "@/components/layout/page-shell";
import { DashboardRunsClient } from "@/components/runs/dashboard-runs-client";
import { createServerClient } from "@/lib/supabase-server";
import type { Profile, Run } from "@/types";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const [{ data: runs }, { data: profile }] = await Promise.all([
    supabase.from("runs").select("*").order("date", { ascending: false }),
    supabase
      .from("profiles")
      .select("id,name,weekly_km_goal,max_hr,ftp_pace,strava_connected")
      .single(),
  ]);
  const initialRuns = (runs ?? []) as unknown as Run[];
  const initialProfile = profile as Pick<
    Profile,
    | "id"
    | "name"
    | "weekly_km_goal"
    | "max_hr"
    | "ftp_pace"
    | "strava_connected"
  > | null;

  return (
    <PageShell title="Dashboard">
      <DashboardRunsClient initialRuns={initialRuns} profile={initialProfile} />
    </PageShell>
  );
}
