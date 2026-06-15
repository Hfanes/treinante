"use server";

import { createServerClient } from "@/lib/supabase-server";
import { estimatedMaxHrFromLthr } from "@/lib/trainingTools";

export interface SaveMaxHrState {
  status: "idle" | "saved" | "error" | "auth_required";
  message: string | null;
}

export async function saveEstimatedMaxHr(
  _state: SaveMaxHrState,
  formData: FormData
): Promise<SaveMaxHrState> {
  const lthr = Number(formData.get("lthr"));
  const estimatedMaxHr = estimatedMaxHrFromLthr(lthr);

  if (!estimatedMaxHr) {
    return { status: "error", message: "Enter a valid 20-minute test HR." };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "auth_required",
      message: "Sign in to save this estimate to your profile.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ max_hr: estimatedMaxHr })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Could not save max HR." };
  }

  return {
    status: "saved",
    message: `Saved ${estimatedMaxHr} bpm as your max HR.`,
  };
}
