import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { StravaRateLimitError, syncStravaRuns } from "@/lib/stravaClient";

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const fields = err as Record<string, unknown>;
    const messageParts = [
      fields.message,
      fields.details,
      fields.hint,
      fields.code,
    ].filter((value): value is string => typeof value === "string");

    if (messageParts.length > 0) return messageParts.join(" ");
  }

  return "Could not sync Strava runs";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fullHistory = request.nextUrl.searchParams.get("full") === "true";
    const imported = await syncStravaRuns(user.id, { fullHistory });
    return NextResponse.json({ imported: imported.length });
  } catch (err) {
    return NextResponse.json(
      {
        error: errorMessage(err),
      },
      { status: err instanceof StravaRateLimitError ? 429 : 400 }
    );
  }
}
