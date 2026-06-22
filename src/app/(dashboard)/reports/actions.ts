"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getPreviousWeekStart,
  regenerateWeeklyReport,
} from "@/lib/reportEngine";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServerClient } from "@/lib/supabase-server";

export async function generateLastWeekReport() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const rateLimit = await checkRateLimit(
    `reports:generate:${user.id}`,
    3,
    3600
  );
  if (!rateLimit.allowed) {
    redirect("/reports?report=rate_limited");
  }

  let status: string;

  try {
    const report = await regenerateWeeklyReport(
      supabase,
      user.id,
      getPreviousWeekStart()
    );
    status = report ? "generated" : "empty";
    revalidatePath("/reports");
  } catch (error) {
    console.warn("Weekly report generation failed", error);
    status = "failed";
  }

  redirect(`/reports?report=${status}`);
}
