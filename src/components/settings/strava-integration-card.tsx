"use client";

import { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/components/app-toast";
import { Button, Card } from "@/components/ui";
import { getOAuthCallbackUrl } from "@/lib/auth-redirects";
import { deleteCachedRunsBySource } from "@/lib/idb";
import { createBrowserClient } from "@/lib/supabase";
import type { Profile } from "@/types";

export function StravaIntegrationCard({ profile }: { profile: Profile }) {
  const [connected, setConnected] = useState(profile.strava_connected);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = pendingAction !== null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stravaStatus = params.get("strava");
    if (stravaStatus === "invalid_state") {
      setError(
        "Strava connection could not be verified. Try connecting again."
      );
      return;
    }

    if (stravaStatus === "already_linked") {
      setError(
        "This Strava account is already linked to another Treinante account. Log out and continue with Strava, or disconnect it from the other account first."
      );
      return;
    }

    if (stravaStatus === "missing_athlete") {
      setError("Strava did not return an athlete ID. Try connecting again.");
      return;
    }

    if (stravaStatus !== "connected") return;

    setConnected(true);
    if (params.get("sync") === "failed") {
      setError("Strava connected, but initial sync failed. Try Sync now.");
      return;
    }

    const synced = params.get("synced");
    if (synced !== null) {
      setMessage(`Strava connected. Synced ${synced} new runs.`);
    }
  }, []);

  async function connect() {
    setPendingAction("connect");
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: "custom:strava",
        options: {
          queryParams: {
            approval_prompt: "force",
          },
          redirectTo: `${window.location.origin}${getOAuthCallbackUrl(
            "strava",
            "/settings"
          )}`,
        },
      });

      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not connect Strava.";
      setError(message);
      showErrorToast(message);
      setPendingAction(null);
    }
  }

  async function request(path: string, method = "POST") {
    const response = await fetch(path, { method });
    const text = await response.text();
    let body: {
      imported?: number;
      deleted?: number;
      error?: string;
    } = {};

    try {
      const parsed = text ? (JSON.parse(text) as unknown) : {};
      body =
        parsed && typeof parsed === "object" ? (parsed as typeof body) : {};
    } catch {
      if (!response.ok) {
        throw new Error(
          `Strava request failed with ${response.status}. The server returned an invalid response.`
        );
      }
      throw new Error("Strava request returned an invalid response");
    }

    if (!response.ok) {
      throw new Error(
        body.error ?? `Strava request failed with ${response.status}`
      );
    }
    return body;
  }

  async function sync() {
    setPendingAction("sync");
    setError(null);
    setMessage(null);

    try {
      const body = await request("/api/strava/sync");
      const message = `Synced ${body.imported ?? 0} new runs.`;
      setMessage(message);
      showSuccessToast(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not sync Strava.";
      setError(message);
      showErrorToast(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function resyncAll() {
    setPendingAction("resync");
    setError(null);
    setMessage(null);

    try {
      const body = await request("/api/strava/sync?full=true");
      const message = `Full-history resync imported ${body.imported ?? 0} missing runs.`;
      setMessage(message);
      showSuccessToast(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not resync Strava history.";
      setError(message);
      showErrorToast(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteStravaRuns() {
    if (
      !window.confirm(
        "Delete all Strava-imported runs from this app? This keeps your Strava connection and does not delete anything from Strava."
      )
    ) {
      return;
    }

    setPendingAction("delete-runs");
    setError(null);
    setMessage(null);

    try {
      const body = await request("/api/strava/runs", "DELETE");
      await deleteCachedRunsBySource(profile.id, "strava");
      const message = `Deleted ${body.deleted ?? 0} Strava-imported runs from this app.`;
      setMessage(message);
      showSuccessToast(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not delete Strava runs.";
      setError(message);
      showErrorToast(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function disconnect() {
    if (
      !window.confirm(
        "Disconnect Strava? This removes stored tokens and stops future syncs. Existing imported runs stay in this app."
      )
    ) {
      return;
    }

    setPendingAction("disconnect");
    setError(null);
    setMessage(null);

    try {
      await request("/api/strava/disconnect");
      setConnected(false);
      const message =
        "Strava disconnected. Stored tokens were removed. Existing imported runs were kept.";
      setMessage(message);
      showSuccessToast(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not disconnect Strava.";
      setError(message);
      showErrorToast(message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card subtitle="Import Strava runs while keeping OAuth tokens in server-only storage.">
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-950 dark:text-white">
            {connected ? "Strava connected" : "Strava not connected"}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {connected
              ? "Sync now imports new Run activities. Resync all history backfills missing older runs. Disconnect keeps imported runs."
              : "Connect with activity read permission to import your runs."}
          </p>
          {connected ? (
            <div className="mt-3 inline-flex flex-col rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <span className="ui-label">Strava athlete</span>
              <span className="mt-1 text-lg font-medium text-[var(--bone)]">
                {profile.strava_athlete_name ?? "Connected Strava account"}
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {connected ? (
            <>
              <Button
                className="w-full sm:w-auto"
                type="button"
                disabled={pending}
                onClick={() => void sync()}
              >
                {pendingAction === "sync" ? "Syncing..." : "Sync now"}
              </Button>
              <Button
                className="w-full sm:w-auto"
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => void resyncAll()}
              >
                {pendingAction === "resync"
                  ? "Resyncing..."
                  : "Resync all history"}
              </Button>
              <Button
                className="w-full sm:w-auto"
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => void deleteStravaRuns()}
              >
                {pendingAction === "delete-runs"
                  ? "Deleting..."
                  : "Delete Strava runs"}
              </Button>
              <Button
                className="w-full sm:w-auto"
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => void disconnect()}
              >
                {pendingAction === "disconnect"
                  ? "Disconnecting..."
                  : "Disconnect"}
              </Button>
            </>
          ) : (
            <Button
              className="w-full sm:w-auto"
              type="button"
              disabled={pending}
              onClick={() => void connect()}
            >
              {pendingAction === "connect" ? "Connecting..." : "Connect Strava"}
            </Button>
          )}
        </div>
      </div>
      {message ? (
        <p className="mt-4 text-sm text-green-700 dark:text-green-400">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </Card>
  );
}
