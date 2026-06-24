"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showStravaImportToast } from "@/components/app-toast";
import { STRAVA_SYNC_COMPLETE_EVENT } from "@/lib/strava-sync-events";

export function StravaImportingClient({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const response = await fetch("/api/strava/sync", { method: "POST" });
        const body = (await response.json()) as {
          error?: string;
          imported?: number;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Strava import failed");
        }

        if (!cancelled) {
          const imported = body.imported ?? 0;

          if (imported > 0) {
            window.dispatchEvent(
              new CustomEvent(STRAVA_SYNC_COMPLETE_EVENT, {
                detail: { imported },
              })
            );
            showStravaImportToast(imported);
          }

          router.replace(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Strava import failed");
        }
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [next, router]);

  if (error) {
    return (
      <div className="grid gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-sm text-red-600 dark:text-red-400">
          Strava connected, but importing runs failed: {error}
        </p>
        <button
          className="justify-self-start text-sm text-[var(--primary)] underline-offset-4 hover:underline"
          onClick={() => router.replace(next)}
          type="button"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-[2px] border border-[var(--border)] bg-[var(--card)] p-6">
      <p className="ui-label text-[var(--primary)]">Strava connected</p>
      <p className="text-sm text-[var(--muted-foreground)]">
        Importing your runs now. This can take a while if you have a long
        activity history.
      </p>
    </div>
  );
}
