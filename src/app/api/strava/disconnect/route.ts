import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin
    .from("strava_tokens")
    .delete()
    .eq("user_id", user.id)
    .throwOnError();
  await admin
    .from("profiles")
    .update({ strava_connected: false })
    .eq("id", user.id)
    .throwOnError();

  return NextResponse.json({ ok: true });
}
