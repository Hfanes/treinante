import { SidebarClient } from "@/components/layout/sidebar-client";
import { createServerClient } from "@/lib/supabase-server";

async function getProfileName() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return data?.name ?? null;
}

export async function Sidebar() {
  const profileName = await getProfileName();

  return <SidebarClient profileName={profileName} />;
}
