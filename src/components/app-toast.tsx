"use client";

import { toast } from "react-toastify";

function showToast(label: string, message: string, tone?: "success" | "error") {
  toast(
    <div>
      <p className="ui-label">{label}</p>
      <p className="mt-2 font-mono text-sm text-[var(--bone)]">{message}</p>
    </div>,
    { type: tone }
  );
}

export function showSuccessToast(message: string) {
  showToast("Saved", message, "success");
}

export function showErrorToast(message: string) {
  showToast("Action failed", message, "error");
}

export function showInfoToast(message: string) {
  showToast("Heads up", message);
}

export function showPrToast(label: string, value: string) {
  showToast("New PR", `${label}: ${value}`, "success");
}

export function showStravaImportToast(imported: number) {
  showToast(
    "Strava sync",
    `Imported ${imported} new Strava ${imported === 1 ? "run" : "runs"}.`,
    "success"
  );
}
