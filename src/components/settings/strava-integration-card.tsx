"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { deleteCachedRunsBySource } from "@/lib/idb";
import type { Profile } from "@/types";

export function StravaIntegrationCard({ profile }: { profile: Profile }) {
  const [connected, setConnected] = useState(profile.strava_connected);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = pendingAction !== null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("strava") !== "connected") return;

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

  function connect() {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) {
      setError("Missing Strava client id.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/strava/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "activity:read_all",
    });

    window.location.assign(`https://www.strava.com/oauth/authorize?${params}`);
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
      setMessage(`Synced ${body.imported ?? 0} new runs.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync Strava.");
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
      setMessage(
        `Full-history resync imported ${body.imported ?? 0} missing runs.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resync Strava history."
      );
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
      setMessage(
        `Deleted ${body.deleted ?? 0} Strava-imported runs from this app.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete Strava runs."
      );
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
      setMessage(
        "Strava disconnected. Stored tokens were removed. Existing imported runs were kept."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not disconnect Strava."
      );
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
        </div>
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <Button
                type="button"
                disabled={pending}
                onClick={() => void sync()}
              >
                {pendingAction === "sync" ? "Syncing..." : "Sync now"}
              </Button>
              <Button
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
            <Button type="button" onClick={connect}>
              Connect Strava
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
