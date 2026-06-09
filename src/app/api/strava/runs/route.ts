import { NextResponse } from "next/server";
import { recalculateFitnessSnapshots } from "@/lib/calculations";
import { recalculatePersonalRecords } from "@/lib/prExtractor";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase-server";

export async function DELETE() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { error, count } = await admin
      .from("runs")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("source", "strava");

    if (error) throw error;
    await recalculatePersonalRecords(admin, user.id);
    await recalculateFitnessSnapshots(admin, user.id);

    return NextResponse.json({ deleted: count ?? 0 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not delete Strava runs",
      },
      { status: 400 }
    );
  }
}
