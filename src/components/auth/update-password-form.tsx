"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button, Card } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Redirecting to settings...");
      window.setTimeout(() => window.location.assign("/settings"), 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      className="w-full max-w-md"
      subtitle="Choose a new password for your account."
    >
      <div className="mb-6">
        <p className="ui-label">Treinante</p>
        <h1 className="instrument-heading mt-2 text-4xl">Update password</h1>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          New password
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--bone)] transition focus:border-[var(--primary)]"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Confirm new password
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--bone)] transition focus:border-[var(--primary)]"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            {message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
