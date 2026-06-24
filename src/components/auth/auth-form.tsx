"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button, Card } from "@/components/ui";
import { getAuthRedirectUrl } from "@/lib/auth-redirects";
import { useAuth } from "@/hooks/useAuth";
import type { LoginMethod } from "@/lib/auth-redirects";

type AuthMode = "login" | "signup";

export function AuthForm({
  lastLoginMethod,
  mode,
  next,
}: {
  lastLoginMethod: LoginMethod | null;
  mode: AuthMode;
  next: string;
}) {
  const { signIn, signInWithGoogle, signInWithStrava, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const isLogin = mode === "login";

  const alternateHref = getAuthRedirectUrl(
    isLogin ? "/signup" : "/login",
    next
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);

    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        const submittedEmail = email.trim();
        await signUp(submittedEmail, password);
        setConfirmationEmail(submittedEmail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setPending(false);
    }
  }

  async function handleStrava() {
    setError(null);
    setPending(true);

    try {
      await signInWithStrava();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Strava sign-in failed.");
      setPending(false);
    }
  }

  function LastUsedBadge({ method }: { method: LoginMethod }) {
    return lastLoginMethod === method ? (
      <span className="ml-2 rounded-[2px] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
        Last used
      </span>
    ) : null;
  }

  if (confirmationEmail) {
    return (
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-[18px] border border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]">
          <Mail aria-hidden="true" className="size-8" strokeWidth={2} />
        </div>
        <h1 className="instrument-heading text-3xl">Review your inbox</h1>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-[var(--muted-foreground)]">
          We sent a confirmation link to{" "}
          <span className="font-medium text-[var(--bone)] break-all">
            {confirmationEmail}
          </span>
          .
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Click the link to activate your account.
        </p>
        <Link
          className="mt-8 inline-block text-sm font-medium text-[var(--secondary)] no-underline hover:text-[var(--primary)]"
          href={alternateHref}
        >
          Back to log in
        </Link>
      </Card>
    );
  }

  return (
    <Card
      className="w-full max-w-md"
      subtitle={
        isLogin
          ? "Access your runs, trends, records, and training profile."
          : "Create your runner profile without picking a discipline up front."
      }
    >
      <div className="mb-6">
        <p className="ui-label">Treinante</p>
        <h1 className="instrument-heading mt-2 text-4xl">
          {isLogin ? "Log in" : "Create account"}
        </h1>
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
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
          <span className="flex items-center justify-between gap-3">
            Password
            {isLogin ? (
              <Link
                className="text-xs font-medium text-brand-600 no-underline dark:text-brand-400"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
            ) : null}
          </span>
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--bone)] transition focus:border-[var(--primary)]"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Working..." : isLogin ? "Log in" : "Create account"}
          <LastUsedBadge method="email" />
        </Button>
      </form>

      <div className="ui-label my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--border)]" />
        or
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <Button
        className="w-full"
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={handleGoogle}
      >
        Continue with Google
        <LastUsedBadge method="google" />
      </Button>

      <Button
        className="mt-3 w-full"
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={handleStrava}
      >
        Continue with Strava
        <LastUsedBadge method="strava" />
      </Button>

      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        Use Strava to create or log into a Strava-linked Treinante account.
      </p>

      <p className="mt-5 text-sm text-[var(--muted-foreground)]">
        {isLogin ? "New here?" : "Already have an account?"}{" "}
        <Link
          className="font-medium text-[var(--primary)] no-underline"
          href={alternateHref}
        >
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </Card>
  );
}
