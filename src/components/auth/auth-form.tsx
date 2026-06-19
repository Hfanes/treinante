"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button, Card } from "@/components/ui";
import { getAuthRedirectUrl } from "@/lib/auth-redirects";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "login" | "signup";

export function AuthForm({ mode, next }: { mode: AuthMode; next: string }) {
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);

    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setMessage("Check your email to confirm your account, then log in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setPending(false);
    }
  }

  const alternateHref = getAuthRedirectUrl(
    isLogin ? "/signup" : "/login",
    next
  );

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
        {message ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            {message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Working..." : isLogin ? "Log in" : "Create account"}
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
      </Button>

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
