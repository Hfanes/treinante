"use client";

import { FormEvent, useState } from "react";

import { showInfoToast } from "@/components/app-toast";
import { Button, Card } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import type { Profile } from "@/types";

const KM_TO_MI = 0.621371;

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

function formatDecimal(value: number) {
  return String(Math.round(value * 10) / 10);
}

function formatPace(seconds: number | null, unit: Profile["unit_preference"]) {
  if (!seconds) return "";
  const displaySeconds = unit === "imperial" ? seconds / KM_TO_MI : seconds;
  const rounded = Math.round(displaySeconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function parsePace(value: string, unit: Profile["unit_preference"]) {
  if (!value.trim()) return null;
  const [minutes, seconds] = value.split(":");
  const totalSeconds = seconds
    ? Number(minutes) * 60 + Number(seconds)
    : Number(value);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return NaN;
  return Math.round(
    unit === "imperial" ? totalSeconds * KM_TO_MI : totalSeconds
  );
}

export function AccountSettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name ?? "");
  const [unitPreference, setUnitPreference] = useState(profile.unit_preference);
  const [weeklyGoal, setWeeklyGoal] = useState(
    formatDecimal(
      profile.unit_preference === "imperial"
        ? profile.weekly_km_goal * KM_TO_MI
        : profile.weekly_km_goal
    )
  );
  const [maxHr, setMaxHr] = useState(
    profile.max_hr ? String(profile.max_hr) : ""
  );
  const [restingHr, setRestingHr] = useState(
    profile.resting_hr ? String(profile.resting_hr) : ""
  );
  const [lthr, setLthr] = useState(profile.lthr ? String(profile.lthr) : "");
  const [hrZoneMethod, setHrZoneMethod] = useState(profile.hr_zone_method);
  const [ftpPace, setFtpPace] = useState(
    formatPace(profile.ftp_pace, profile.unit_preference)
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
    const weeklyKmGoalValue =
      unitPreference === "imperial"
        ? weeklyGoalValue / KM_TO_MI
        : weeklyGoalValue;
    const maxHrValue = parseOptionalInteger(maxHr);
    const restingHrValue = parseOptionalInteger(restingHr);
    const lthrValue = parseOptionalInteger(lthr);
    const effectiveHrZoneMethod =
      hrZoneMethod === "lthr" && lthrValue
        ? "lthr"
        : hrZoneMethod === "max_hr" && maxHrValue
          ? "max_hr"
          : lthrValue
            ? "lthr"
            : "max_hr";
    const ftpPaceValue = parsePace(ftpPace, unitPreference);

    if (!Number.isFinite(weeklyGoalValue) || weeklyGoalValue <= 0) {
      setError("Weekly goal must be a positive number.");
      return;
    }

    if (
      [maxHrValue, restingHrValue, lthrValue, ftpPaceValue].some(
        (value) => value !== null && (!Number.isInteger(value) || value <= 0)
      )
    ) {
      setError(
        "Heart-rate and threshold pace values must be positive whole numbers."
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
              unit_preference: unitPreference,
              weekly_km_goal: weeklyKmGoalValue,
              max_hr: maxHrValue,
              resting_hr: restingHrValue,
              lthr: lthrValue,
              hr_zone_method: effectiveHrZoneMethod,
              ftp_pace: ftpPaceValue,
            })
            .eq("id", profile.id),
        () => {
          setRetrying(true);
          showInfoToast(
            "Database is waking up. This can take a few seconds on first load."
          );
        }
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

  function handleUnitChange(nextUnit: Profile["unit_preference"]) {
    if (nextUnit === unitPreference) return;

    const goal = Number(weeklyGoal);
    if (Number.isFinite(goal) && goal > 0) {
      setWeeklyGoal(
        formatDecimal(
          nextUnit === "imperial" ? goal * KM_TO_MI : goal / KM_TO_MI
        )
      );
    }

    const currentPace = parsePace(ftpPace, unitPreference);
    setFtpPace(formatPace(currentPace, nextUnit));
    setUnitPreference(nextUnit);
  }

  const hasMaxHr = parseOptionalInteger(maxHr) !== null;
  const hasLthr = parseOptionalInteger(lthr) !== null;

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
          Units
          <select
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            value={unitPreference}
            onChange={(event) =>
              handleUnitChange(event.target.value as Profile["unit_preference"])
            }
          >
            <option value="metric">Metric</option>
            <option value="imperial">Miles</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Weekly {unitPreference === "imperial" ? "mile" : "km"} goal
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
          LTHR
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            min="1"
            type="number"
            value={lthr}
            onChange={(event) => setLthr(event.target.value)}
          />
        </label>
        {hasMaxHr && hasLthr ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
            HR zone method
            <select
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
              value={hrZoneMethod}
              onChange={(event) =>
                setHrZoneMethod(event.target.value as Profile["hr_zone_method"])
              }
            >
              <option value="max_hr">Max HR</option>
              <option value="lthr">LTHR</option>
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Threshold pace ({unitPreference === "imperial" ? "min/mi" : "min/km"})
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
            placeholder={unitPreference === "imperial" ? "7:15" : "4:30"}
            value={ftpPace}
            onChange={(event) => setFtpPace(event.target.value)}
          />
        </label>

        <div className="space-y-2 rounded-[2px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)] md:col-span-2">
          <p>
            Zones use average run HR first. Max HR compares average HR to your
            maximum; LTHR compares average HR to your lactate threshold and is
            usually better if you know it.
          </p>
          <p>
            If only Max HR or only LTHR is set, the app uses the one you set. If
            both are set, HR zone method chooses which one wins.
          </p>
          <p>
            Threshold pace is the fallback when a run has no usable HR. Slower
            than threshold is easier; near threshold is tempo; faster is hard.
          </p>
        </div>

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
