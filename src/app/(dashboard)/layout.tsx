import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavClient } from "@/components/layout/mobile-nav-client";
import { OnboardingModal } from "@/components/auth/onboarding-modal";
import { StravaAutoSync } from "@/components/strava-auto-sync";
import { ensurePreviousWeeklyReport } from "@/lib/reportEngine";
import { createServerClient } from "@/lib/supabase-server";
import type { Profile } from "@/types";

async function getProfile() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  await ensurePreviousWeeklyReport(supabase, user.id).catch(() => {
    console.warn("Weekly report auto-generation failed");
  });

  return data as Profile | null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar />
      {children}
      {profile && !profile.onboarding_complete ? (
        <OnboardingModal initialProfile={profile} />
      ) : null}
      <StravaAutoSync
        enabled={Boolean(profile?.strava_connected && profile.onboarding_complete)}
      />
      <MobileNavClient isLoggedIn={Boolean(profile)} />
    </div>
  );
}
