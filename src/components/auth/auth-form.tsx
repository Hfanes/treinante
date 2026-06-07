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
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
          RunMetrics
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
          {isLogin ? "Log in" : "Create account"}
        </h1>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
          Email
          <input
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
          Password
          <input
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        or
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
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

      <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
        {isLogin ? "New here?" : "Already have an account?"}{" "}
        <Link
          className="font-medium text-brand-600 no-underline dark:text-brand-400"
          href={alternateHref}
        >
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </Card>
  );
}
