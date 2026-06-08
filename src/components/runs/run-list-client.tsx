"use client";

import { useEffect } from "react";

import { Card } from "@/components/ui";
import { upsertCachedRuns } from "@/lib/idb";
import type { Run } from "@/types";

function formatKm(value: number) {
  return `${value.toFixed(1)} km`;
}

export function RunListClient({ initialRuns }: { initialRuns: Run[] }) {
  useEffect(() => {
    if (initialRuns.length > 0) {
      void upsertCachedRuns(initialRuns);
    }
  }, [initialRuns]);

  if (initialRuns.length === 0) {
    return (
      <Card subtitle="Import or add a run to start building your training history.">
        <p className="text-sm text-gray-600 dark:text-gray-300">No runs yet.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {initialRuns.map((run) => (
        <Card
          key={run.id}
          subtitle={`${run.title ?? "Untitled run"} • ${run.source.toUpperCase()} • ${run.date}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-2xl font-semibold text-gray-950 dark:text-white">
                {formatKm(run.distance)}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Avg pace {run.avg_pace}s/km • Moving time {run.moving_time}s
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              D+ {run.elevation_gain.toFixed(0)} m
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
