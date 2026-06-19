"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button, Card } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    setPending(true);

    try {
      const supabase = createBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        }
      );

      if (resetError) throw resetError;

      setMessage("If an account exists, check your email.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send reset email."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      className="w-full max-w-md"
      subtitle="Send a password reset link to the email on your account."
    >
      <div className="mb-6">
        <p className="ui-label">Treinante</p>
        <h1 className="instrument-heading mt-2 text-4xl">Recover account</h1>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          Email
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--bone)] transition focus:border-[var(--primary)]"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-5 text-sm text-[var(--muted-foreground)]">
        Forgot which email you used? Try signing in with Google, or search your
        inbox for "Treinante" to find the original signup email.
      </p>
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
        Remembered it?{" "}
        <Link
          className="font-medium text-[var(--primary)] no-underline"
          href="/login"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}
