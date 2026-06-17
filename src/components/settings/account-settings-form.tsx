"use client";

import { FormEvent, useState } from "react";

import { Button, Card } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import type { Profile } from "@/types";

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

export function AccountSettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name ?? "");
  const [weeklyGoal, setWeeklyGoal] = useState(String(profile.weekly_km_goal));
  const [maxHr, setMaxHr] = useState(
    profile.max_hr ? String(profile.max_hr) : ""
  );
  const [restingHr, setRestingHr] = useState(
    profile.resting_hr ? String(profile.resting_hr) : ""
  );
  const [ftpPace, setFtpPace] = useState(
    profile.ftp_pace ? String(profile.ftp_pace) : ""
  );
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const weeklyGoalValue = Number(weeklyGoal);
    const maxHrValue = parseOptionalInteger(maxHr);
    const restingHrValue = parseOptionalInteger(restingHr);
    const ftpPaceValue = parseOptionalInteger(ftpPace);

    if (!Number.isFinite(weeklyGoalValue) || weeklyGoalValue <= 0) {
      setError("Weekly goal must be a positive number.");
      return;
    }

    if (
      [maxHrValue, restingHrValue, ftpPaceValue].some(
        (value) => value !== null && (!Number.isInteger(value) || value <= 0)
      )
    ) {
      setError(
        "Heart-rate and FTP pace values must be positive whole numbers."
      );
      return;
    }

    setPending(true);
    setRetrying(false);

    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await withSupabaseRetry(
        async () =>
          await supabase
            .from("profiles")
            .update({
              name: name.trim() || null,
              weekly_km_goal: weeklyGoalValue,
              max_hr: maxHrValue,
              resting_hr: restingHrValue,
              ftp_pace: ftpPaceValue,
            })
            .eq("id", profile.id),
        () => setRetrying(true)
      );

      if (updateError) throw updateError;
      setMessage("Account settings saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save account settings."
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <Card subtitle="Edit the profile values used across reports and training calculations.">
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Name
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Weekly km goal
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            min="1"
            step="0.1"
            type="number"
            value={weeklyGoal}
            onChange={(event) => setWeeklyGoal(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Max HR
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            min="1"
            type="number"
            value={maxHr}
            onChange={(event) => setMaxHr(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Resting HR
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            min="1"
            type="number"
            value={restingHr}
            onChange={(event) => setRestingHr(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          FTP pace
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            min="1"
            type="number"
            value={ftpPace}
            onChange={(event) => setFtpPace(event.target.value)}
          />
        </label>

        <div className="flex flex-col justify-end gap-3 md:col-span-2 md:flex-row">
          <Button
            className="w-full sm:w-auto"
            type="button"
            variant="secondary"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
          <Button className="w-full sm:w-auto" type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>

      {retrying ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
          Waking up — takes a few seconds on first load
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-green-700 dark:text-green-400">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
