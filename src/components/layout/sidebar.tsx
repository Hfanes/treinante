import { SidebarClient } from "@/components/layout/sidebar-client";
import { createServerClient } from "@/lib/supabase-server";

async function getSidebarState() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { isLoggedIn: Boolean(user) };
}

export async function Sidebar() {
  const { isLoggedIn } = await getSidebarState();

  return <SidebarClient isLoggedIn={isLoggedIn} />;
}
