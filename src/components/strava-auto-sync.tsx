"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { showStravaImportToast } from "@/components/app-toast";
import { STRAVA_SYNC_COMPLETE_EVENT } from "@/lib/strava-sync-events";

const STRAVA_AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

interface StravaSyncResponse {
  imported?: number;
  error?: string;
}

function isTransientFetchError(err: unknown) {
  return (
    err instanceof TypeError ||
    (err instanceof DOMException && err.name === "AbortError")
  );
}

export function StravaAutoSync({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const syncingRef = useRef(false);
  const nextAllowedSyncRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    async function sync() {
      if (
        syncingRef.current ||
        Date.now() < nextAllowedSyncRef.current ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      ) {
        return;
      }

      syncingRef.current = true;

      try {
        const response = await fetch("/api/strava/sync", { method: "POST" });
        const body = (await response.json()) as StravaSyncResponse;

        if (response.status === 401) {
          return;
        }

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          nextAllowedSyncRef.current =
            Date.now() +
            (Number.isFinite(retryAfter) ? retryAfter : 600) * 1000;
          return;
        }

        if (!response.ok) {
          throw new Error(body.error ?? "Strava auto-sync failed");
        }

        const imported = body.imported ?? 0;

        if (imported > 0) {
          window.dispatchEvent(
            new CustomEvent(STRAVA_SYNC_COMPLETE_EVENT, {
              detail: { imported },
            })
          );
          showStravaImportToast(imported);
          router.refresh();
        }
      } catch (err) {
        if (isTransientFetchError(err)) return;

        console.warn("Strava auto-sync failed", err);
      } finally {
        syncingRef.current = false;
      }
    }

    function syncIfVisible() {
      if (document.visibilityState === "visible") {
        void sync();
      }
    }

    void sync();

    const interval = window.setInterval(sync, STRAVA_AUTO_SYNC_INTERVAL_MS);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", syncIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", syncIfVisible);
    };
  }, [enabled, router]);

  return null;
}
