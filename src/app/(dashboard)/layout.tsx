import { Sidebar } from "@/components/layout/sidebar";
import { OnboardingModal } from "@/components/auth/onboarding-modal";
import { ensurePreviousWeeklyReport } from "@/lib/reportEngine";
import { createServerClient } from "@/lib/supabase-server";
import type { Profile } from "@/types";
import Link from "next/link";

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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      {children}
      {profile && !profile.onboarding_complete ? (
        <OnboardingModal initialProfile={profile} />
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-gray-200 bg-white text-xs dark:border-gray-800 dark:bg-gray-950 md:hidden">
        <Link className="p-3 text-center no-underline" href="/dashboard">
          Dashboard
        </Link>
        <Link className="p-3 text-center no-underline" href="/runs">
          Runs
        </Link>
        <Link className="p-3 text-center no-underline" href="/tools">
          Tools
        </Link>
        <Link className="p-3 text-center no-underline" href="/fitness">
          Fitness
        </Link>
        <Link className="p-3 text-center no-underline" href="/settings">
          More
        </Link>
      </nav>
    </div>
  );
}
