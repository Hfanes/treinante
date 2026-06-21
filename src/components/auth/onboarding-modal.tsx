"use client";

import { FormEvent, useState } from "react";

import { showInfoToast } from "@/components/app-toast";
import { Button } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import type { Profile } from "@/types";

const KM_TO_MI = 0.621371;

function optionalNumber(value: string) {
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

export function OnboardingModal({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialProfile.name ?? "");
  const [unitPreference, setUnitPreference] = useState(
    initialProfile.unit_preference
  );
  const [weeklyGoal, setWeeklyGoal] = useState(
    formatDecimal(
      initialProfile.unit_preference === "imperial"
        ? initialProfile.weekly_km_goal * KM_TO_MI
        : initialProfile.weekly_km_goal
    )
  );
  const [maxHr, setMaxHr] = useState(
    initialProfile.max_hr ? String(initialProfile.max_hr) : ""
  );
  const [restingHr, setRestingHr] = useState(
    initialProfile.resting_hr ? String(initialProfile.resting_hr) : ""
  );
  const [lthr, setLthr] = useState(
    initialProfile.lthr ? String(initialProfile.lthr) : ""
  );
  const [hrZoneMethod, setHrZoneMethod] = useState(
    initialProfile.hr_zone_method
  );
  const [ftpPace, setFtpPace] = useState(
    formatPace(initialProfile.ftp_pace, initialProfile.unit_preference)
  );
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  if (complete) return null;

  function validateCurrentStep() {
    if (step === 1 && !name.trim()) {
      return "Enter your display name to continue.";
    }

    if (
      step === 2 &&
      (!Number.isFinite(Number(weeklyGoal)) || Number(weeklyGoal) <= 0)
    ) {
      return "Weekly goal must be a positive number.";
    }

    return null;
  }

  function nextStep() {
    const validationError = validateCurrentStep();
    setError(validationError);

    if (!validationError) {
      setStep((currentStep) => Math.min(currentStep + 1, 3));
    }
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCurrentStep();
    setError(validationError);

    if (validationError) return;

    const maxHrValue = optionalNumber(maxHr);
    const restingHrValue = optionalNumber(restingHr);
    const lthrValue = optionalNumber(lthr);
    const ftpPaceValue = parsePace(ftpPace, unitPreference);
    const effectiveHrZoneMethod =
      hrZoneMethod === "lthr" && lthrValue
        ? "lthr"
        : hrZoneMethod === "max_hr" && maxHrValue
          ? "max_hr"
          : lthrValue
            ? "lthr"
            : "max_hr";

    if (
      (maxHrValue !== null &&
        (!Number.isInteger(maxHrValue) || maxHrValue <= 0)) ||
      (restingHrValue !== null &&
        (!Number.isInteger(restingHrValue) || restingHrValue <= 0)) ||
      (lthrValue !== null &&
        (!Number.isInteger(lthrValue) || lthrValue <= 0)) ||
      (ftpPaceValue !== null &&
        (!Number.isInteger(ftpPaceValue) || ftpPaceValue <= 0))
    ) {
      setError("Heart-rate and threshold pace values must be positive.");
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
              name: name.trim(),
              unit_preference: unitPreference,
              weekly_km_goal:
                unitPreference === "imperial"
                  ? Number(weeklyGoal) / KM_TO_MI
                  : Number(weeklyGoal),
              max_hr: maxHrValue,
              resting_hr: restingHrValue,
              lthr: lthrValue,
              hr_zone_method: effectiveHrZoneMethod,
              ftp_pace: ftpPaceValue,
              onboarding_complete: true,
            })
            .eq("id", initialProfile.id),
        () => {
          setRetrying(true);
          showInfoToast(
            "Database is waking up. This can take a few seconds on first load."
          );
        }
      );

      if (updateError) {
        throw updateError;
      }

      setComplete(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save onboarding."
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSkip() {
    setPending(true);
    setRetrying(false);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await withSupabaseRetry(
        async () =>
          await supabase
            .from("profiles")
            .update({ onboarding_complete: true })
            .eq("id", initialProfile.id),
        () => {
          setRetrying(true);
          showInfoToast(
            "Database is waking up. This can take a few seconds on first load."
          );
        }
      );

      if (updateError) throw updateError;
      setComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip setup.");
    } finally {
      setPending(false);
    }
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

  const hasMaxHr = optionalNumber(maxHr) !== null;
  const hasLthr = optionalNumber(lthr) !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        className="instrument-card w-full max-w-lg p-6"
        onSubmit={handleComplete}
      >
        <p className="ui-label">Step {step} of 3</p>
        <h2 className="instrument-heading mt-2 text-4xl">
          Set up your runner profile
        </h2>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          You can skip this now. You can and should change these values later in
          Settings as your data improves.
        </p>

        <div className="mt-6">
          {step === 1 ? (
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Display name
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Units
                <select
                  className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                  value={unitPreference}
                  onChange={(event) =>
                    handleUnitChange(
                      event.target.value as Profile["unit_preference"]
                    )
                  }
                >
                  <option value="metric">Metric</option>
                  <option value="imperial">Miles</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Weekly {unitPreference === "imperial" ? "mile" : "km"} goal
                <input
                  className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                  min="1"
                  step="0.1"
                  type="number"
                  value={weeklyGoal}
                  onChange={(event) => setWeeklyGoal(event.target.value)}
                />
                <span className="text-xs font-normal text-[var(--muted-foreground)]">
                  Used for weekly progress. Stored in km internally.
                </span>
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Max HR
                <input
                  className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                  min="1"
                  type="number"
                  value={maxHr}
                  onChange={(event) => setMaxHr(event.target.value)}
                />
                <span className="text-xs font-normal text-[var(--muted-foreground)]">
                  Used for HR zones if selected, or as fallback.
                </span>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Resting HR
                <input
                  className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                  min="1"
                  type="number"
                  value={restingHr}
                  onChange={(event) => setRestingHr(event.target.value)}
                />
                <span className="text-xs font-normal text-[var(--muted-foreground)]">
                  Used for VO2max estimates.
                </span>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                LTHR
                <input
                  className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                  min="1"
                  type="number"
                  value={lthr}
                  onChange={(event) => setLthr(event.target.value)}
                />
                <span className="text-xs font-normal text-[var(--muted-foreground)]">
                  Usually better for HR zones if you know it.
                </span>
              </label>
              {hasMaxHr && hasLthr ? (
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                  HR zone method
                  <select
                    className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                    value={hrZoneMethod}
                    onChange={(event) =>
                      setHrZoneMethod(
                        event.target.value as Profile["hr_zone_method"]
                      )
                    }
                  >
                    <option value="max_hr">Max HR</option>
                    <option value="lthr">LTHR</option>
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)] sm:col-span-2">
                Threshold pace (
                {unitPreference === "imperial" ? "min/mi" : "min/km"})
                <input
                  className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                  placeholder={unitPreference === "imperial" ? "7:15" : "4:30"}
                  value={ftpPace}
                  onChange={(event) => setFtpPace(event.target.value)}
                />
                <span className="text-xs font-normal text-[var(--muted-foreground)]">
                  Used for zones when a run has no usable HR.
                </span>
              </label>
            </div>
          ) : null}
        </div>

        {retrying ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Waking up — takes a few seconds on first load
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((currentStep) => currentStep - 1)}
              >
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Finish setup"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
