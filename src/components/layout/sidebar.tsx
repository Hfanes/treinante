import { SidebarClient } from "@/components/layout/sidebar-client";
import { createServerClient } from "@/lib/supabase-server";

async function getSidebarState() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isLoggedIn: false };

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [{ data: latestRun }, { data: recentPr }] = await Promise.all([
    supabase
      .from("runs")
      .select("tsb_at_date")
      .not("tsb_at_date", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("personal_record_events")
      .select("id")
      .gte("achieved_at", sevenDaysAgo)
      .lte("achieved_at", today)
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    isLoggedIn: true,
    hasFitnessBadge: Number(latestRun?.tsb_at_date ?? 0) < -20,
    hasRecordsBadge: Boolean(recentPr),
  };
}

export async function Sidebar() {
  const { hasFitnessBadge, hasRecordsBadge, isLoggedIn } =
    await getSidebarState();

  return (
    <SidebarClient
      hasFitnessBadge={hasFitnessBadge ?? false}
      hasRecordsBadge={hasRecordsBadge ?? false}
      isLoggedIn={isLoggedIn}
    />
  );
}
