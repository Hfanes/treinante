"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { showErrorToast, showSuccessToast } from "@/components/app-toast";
import { Button, Card } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

function providerLabel(provider: string) {
  if (provider === "email") return "Email/password";
  if (provider === "google") return "Google";
  if (provider === "strava") return "Strava";

  return provider;
}

export function AccountSecurityForm({
  authProviders,
  email,
}: {
  authProviders: string[];
  email: string | null;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = pendingAction !== null;
  const hasPasswordLogin = authProviders.includes("email");

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      setError("Enter a new email address.");
      return;
    }

    if (trimmedEmail === email) {
      setError("New email must be different from your current email.");
      return;
    }

    setPendingAction("email");

    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });

      if (updateError) throw updateError;

      setNewEmail("");
      setMessage("Check your email to confirm the address change.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update email.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPendingAction("password");

    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password."
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Permanently delete your Treinante account and all app data?"
      )
    ) {
      return;
    }

    setPendingAction("delete");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not delete account.");
      }

      showSuccessToast("Account deleted.");
      window.location.assign("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not delete account.";
      setError(message);
      showErrorToast(message);
      setPendingAction(null);
    }
  }

  return (
    <Card subtitle="Change the credentials used to sign in to Treinante.">
      <div className="mt-4">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Sign-in methods
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {authProviders.map((provider) => (
            <span
              className="rounded-[2px] border border-[var(--border)] px-2 py-1 text-xs text-[var(--bone)]"
              key={provider}
            >
              {providerLabel(provider)}
            </span>
          ))}
        </div>
        {!hasPasswordLogin ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            This account signs in with OAuth. Manage that login from the linked
            provider account.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid items-stretch gap-6 lg:grid-cols-2">
        {hasPasswordLogin ? (
          <form
            className="flex h-full flex-col gap-4"
            onSubmit={handleEmailSubmit}
          >
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Current email
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {email ?? "No email on this account"}
              </p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
              New email
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
            </label>
            <Button className="mt-auto" type="submit" disabled={pending}>
              {pendingAction === "email" ? "Sending..." : "Change email"}
            </Button>
          </form>
        ) : (
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Current email
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {email ?? "No email on this account"}
            </p>
          </div>
        )}

        {hasPasswordLogin ? (
          <form
            className="flex h-full flex-col gap-4"
            onSubmit={handlePasswordSubmit}
          >
            <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
              Current password
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
              New password
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
              Confirm new password
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] focus:border-[var(--primary)]"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <Button className="mt-auto" type="submit" disabled={pending}>
              {pendingAction === "password" ? "Saving..." : "Change password"}
            </Button>
          </form>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-green-700 dark:text-green-400">
          {message}
        </p>
      ) : null}
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
          <div>
            <p className="text-sm font-medium text-[var(--bone)]">
              Danger zone
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Permanently delete your account and app data. This cannot be
              undone.
            </p>
          </div>
          <Button
            className="mt-3 text-white bg-red-700 hover:bg-red-600 focus-visible:ring-red-600 disabled:bg-red-400 disabled:hover:bg-red-400 cursor-pointer"
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => void handleDeleteAccount()}
          >
            {pendingAction === "delete" ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
