"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import type { Profile } from "@/types";

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

export function OnboardingModal({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialProfile.name ?? "");
  const [weeklyGoal, setWeeklyGoal] = useState(
    String(initialProfile.weekly_km_goal ?? 30)
  );
  const [maxHr, setMaxHr] = useState(
    initialProfile.max_hr ? String(initialProfile.max_hr) : ""
  );
  const [restingHr, setRestingHr] = useState(
    initialProfile.resting_hr ? String(initialProfile.resting_hr) : ""
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

    if (
      (maxHrValue !== null &&
        (!Number.isInteger(maxHrValue) || maxHrValue <= 0)) ||
      (restingHrValue !== null &&
        (!Number.isInteger(restingHrValue) || restingHrValue <= 0))
    ) {
      setError("Heart-rate values must be positive whole numbers.");
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
              weekly_km_goal: Number(weeklyGoal),
              max_hr: maxHrValue,
              resting_hr: restingHrValue,
              onboarding_complete: true,
            })
            .eq("id", initialProfile.id),
        () => setRetrying(true)
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
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Weekly km goal
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                min="1"
                step="0.1"
                type="number"
                value={weeklyGoal}
                onChange={(event) => setWeeklyGoal(event.target.value)}
              />
              <span className="text-xs font-normal text-[var(--muted-foreground)]">
                How many km do you aim to run per week on average?
              </span>
            </label>
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
                  Average HR from a recent all-out 20-min effort, or leave
                  blank.
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
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((currentStep) => currentStep - 1)}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
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
