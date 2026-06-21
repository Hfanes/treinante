import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase-server";

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not delete account",
      },
      { status: 400 }
    );
  }
}
