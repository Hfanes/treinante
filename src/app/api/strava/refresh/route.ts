import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { refreshStravaToken } from "@/lib/stravaClient";

export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await refreshStravaToken(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not refresh Strava token",
      },
      { status: 400 }
    );
  }
}
