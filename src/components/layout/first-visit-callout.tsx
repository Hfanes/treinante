"use client";

import { useEffect, useState } from "react";

const COPY: Record<string, string> = {
  Dashboard: "Start here for weekly volume, trends, and quick training status.",
  Runs: "Import GPX files, sync Strava, or add manual runs from this library.",
  Fitness: "Fitness and freshness unlock after 7 unique training days.",
  "Race Predictor":
    "Predictions use your best recent clean effort and current records.",
};

export function FirstVisitCallout({ section }: { section: string }) {
  const [visible, setVisible] = useState(false);
  const message = COPY[section];

  useEffect(() => {
    if (!message) return;
    setVisible(localStorage.getItem(`treinante-seen-${section}`) !== "true");
  }, [message, section]);

  if (!message || !visible) return null;

  return (
    <div className="rounded-[2px] border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="ui-label">First visit</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--bone)]">{message}</p>
        <button
          className="min-h-11 rounded-[2px] border border-[var(--primary)] px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-[var(--primary)]"
          type="button"
          onClick={() => {
            localStorage.setItem(`treinante-seen-${section}`, "true");
            setVisible(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
