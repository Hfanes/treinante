"use client";

import { toast } from "react-toastify";

export function showStravaImportToast(imported: number) {
  toast(
    <div>
      <p className="ui-label">Strava sync</p>
      <p className="mt-2 font-mono text-sm text-[var(--bone)]">
        Imported {imported} new Strava {imported === 1 ? "run" : "runs"}.
      </p>
    </div>
  );
}
