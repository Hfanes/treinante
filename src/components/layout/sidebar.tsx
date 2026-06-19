import { SidebarClient } from "@/components/layout/sidebar-client";
import { createServerClient } from "@/lib/supabase-server";

async function getProfileName() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isLoggedIn: false, profileName: null };

  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return { isLoggedIn: true, profileName: data?.name ?? null };
}

export async function Sidebar() {
  const { isLoggedIn, profileName } = await getProfileName();

  return <SidebarClient isLoggedIn={isLoggedIn} profileName={profileName} />;
}
