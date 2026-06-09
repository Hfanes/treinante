import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { syncStravaRuns } from "@/lib/stravaClient";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fullHistory = request.nextUrl.searchParams.get("full") === "true";
    const imported = await syncStravaRuns(user.id, { fullHistory });
    return NextResponse.json({ imported: imported.length });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not sync Strava runs",
      },
      { status: 400 }
    );
  }
}
