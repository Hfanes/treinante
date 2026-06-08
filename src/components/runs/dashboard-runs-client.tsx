"use client";

import { useEffect } from "react";

import { Card } from "@/components/ui";
import { upsertCachedRuns } from "@/lib/idb";
import type { Run } from "@/types";

export function DashboardRunsClient({ initialRuns }: { initialRuns: Run[] }) {
  useEffect(() => {
    if (initialRuns.length > 0) {
      void upsertCachedRuns(initialRuns);
    }
  }, [initialRuns]);

  const totalKm = initialRuns.reduce((sum, run) => sum + run.distance, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        label="Recent runs"
        value={initialRuns.length}
        subtitle="Latest 100 from Supabase"
      />
      <Card
        label="Distance"
        value={`${totalKm.toFixed(1)} km`}
        subtitle="Across loaded runs"
      />
      <Card
        label="Cache"
        value="Ready"
        subtitle="Initial runs hydrate IndexedDB after first render"
      />
    </div>
  );
}
