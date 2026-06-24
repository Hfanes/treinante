/** @vitest-environment jsdom */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useAuth } from "./useAuth";
import type { Profile } from "@/types";

type AuthChangeCallback = (
  event: string,
  session: { user: User | null } | null
) => void;

const mocks = vi.hoisted(() => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
  withSupabaseRetry: vi.fn((action: () => Promise<unknown>) => action()),
}));

vi.mock("@/lib/supabase", () => ({
  createBrowserClient: () => mocks.supabase,
}));

vi.mock("@/lib/supabase-retry", () => ({
  withSupabaseRetry: mocks.withSupabaseRetry,
}));

const user = { id: "user-1", email: "runner@example.com" } as User;

const profile: Profile = {
  id: user.id,
  name: "Runner",
  unit_preference: "metric",
  weekly_km_goal: 42,
  max_hr: 190,
  resting_hr: 48,
  lthr: 170,
  hr_zone_method: "max_hr",
  ftp_pace: 270,
  strava_connected: false,
  strava_athlete_name: null,
  onboarding_complete: true,
};

let authChangeCallback: AuthChangeCallback | null = null;
const realLocation = window.location;

function makeProfileSelectQuery(result: {
  data: Profile | null;
  error: Error | null;
}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
  };

  return query;
}

function makeProfileUpdateQuery(result: {
  data: Profile | null;
  error: Error | null;
}) {
  const query = {
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => result),
  };

  return query;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function AuthProbe({
  onRender,
}: {
  onRender: (auth: ReturnType<typeof useAuth>) => void;
}) {
  const auth = useAuth();
  onRender(auth);

  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="profile-name">{auth.profile?.name ?? "none"}</span>
    </div>
  );
}

function stubLocationAssign() {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign },
  });

  return assign;
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });
    mocks.supabase.auth.onAuthStateChange.mockImplementation(
      (callback: AuthChangeCallback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }
    );
    mocks.supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: null,
    });
    mocks.supabase.auth.signUp.mockResolvedValue({ data: {}, error: null });
    mocks.supabase.auth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: null,
    });
    mocks.supabase.auth.signOut.mockResolvedValue({ error: null });
    mocks.withSupabaseRetry.mockImplementation(
      (action: () => Promise<unknown>) => action()
    );
    window.history.replaceState(null, "", "/login");
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: realLocation,
    });
    vi.unstubAllGlobals();
  });

  test("initial load fetches the current user profile by id", async () => {
    const profileQuery = makeProfileSelectQuery({ data: profile, error: null });
    mocks.supabase.from.mockReturnValue(profileQuery);
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);

    expect(screen.getByTestId("loading").textContent).toBe("true");
    await waitFor(() =>
      expect(screen.getByTestId("profile-name").textContent).toBe("Runner")
    );

    expect(latestAuth?.user).toBe(user);
    expect(mocks.supabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.supabase.from).toHaveBeenCalledWith("profiles");
    expect(profileQuery.select).toHaveBeenCalledWith("*");
    expect(profileQuery.eq).toHaveBeenCalledWith("id", user.id);
    expect(profileQuery.single).toHaveBeenCalledTimes(1);
    expect(mocks.withSupabaseRetry).toHaveBeenCalledTimes(1);
  });

  test("signIn calls Supabase password auth", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    stubLocationAssign();
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signIn("runner@example.com", "secret-password");
    });

    expect(mocks.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "runner@example.com",
      password: "secret-password",
    });
  });

  test("signIn redirects to the safe next path after successful login", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    window.history.replaceState(null, "", "/login?next=/runs");
    const assign = stubLocationAssign();
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signIn("runner@example.com", "secret-password");
    });

    expect(assign).toHaveBeenCalledWith("/runs");
  });

  test("signIn redirects to dashboard when next is unsafe or missing", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    window.history.replaceState(null, "", "/login?next=https://evil.test");
    const assign = stubLocationAssign();
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signIn("runner@example.com", "secret-password");
    });

    expect(assign).toHaveBeenCalledWith("/dashboard");
  });

  test("signUp calls Supabase password signup", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signUp("new-runner@example.com", "secret-password");
    });

    expect(mocks.supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new-runner@example.com",
      password: "secret-password",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?login=email",
      },
    });
  });

  test("signUp keeps a safe next path in the confirmation redirect", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    window.history.replaceState(null, "", "/signup?next=/runs");
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signUp("new-runner@example.com", "secret-password");
    });

    expect(mocks.supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new-runner@example.com",
      password: "secret-password",
      options: {
        emailRedirectTo:
          "http://localhost:3000/auth/callback?next=%2Fruns&login=email",
      },
    });
  });

  test("signUp clears a stale local session and retries refresh-token failures", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.supabase.auth.signUp
      .mockResolvedValueOnce({
        data: null,
        error: new Error("Invalid Refresh Token: Refresh Token Not Found"),
      })
      .mockResolvedValueOnce({ data: {}, error: null });
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signUp("new-runner@example.com", "secret-password");
    });

    expect(mocks.supabase.auth.signOut).toHaveBeenCalledWith({
      scope: "local",
    });
    expect(mocks.supabase.auth.signUp).toHaveBeenCalledTimes(2);
  });

  test("signUp throws a meaningful Supabase auth error", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.supabase.auth.signUp.mockResolvedValue({
      data: null,
      error: new Error("User already registered"),
    });
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    await expect(
      latestAuth?.signUp("runner@example.com", "secret-password")
    ).rejects.toThrow("Failed to sign up: User already registered");
  });

  test("updateProfile updates the current user profile and refreshes local state", async () => {
    const initialQuery = makeProfileSelectQuery({ data: profile, error: null });
    const updatedProfile = { ...profile, name: "Updated Runner" };
    const updateQuery = makeProfileUpdateQuery({
      data: updatedProfile,
      error: null,
    });
    mocks.supabase.from
      .mockReturnValueOnce(initialQuery)
      .mockReturnValueOnce(updateQuery);
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("profile-name").textContent).toBe("Runner")
    );
    await act(async () => {
      await latestAuth?.updateProfile({ name: "Updated Runner" });
    });

    expect(updateQuery.update).toHaveBeenCalledWith({ name: "Updated Runner" });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", user.id);
    expect(updateQuery.select).toHaveBeenCalledWith("*");
    expect(screen.getByTestId("profile-name").textContent).toBe(
      "Updated Runner"
    );
    expect(mocks.withSupabaseRetry).toHaveBeenCalledTimes(2);
  });

  test("updateProfile throws a meaningful Supabase profile error", async () => {
    const initialQuery = makeProfileSelectQuery({ data: profile, error: null });
    const updateQuery = makeProfileUpdateQuery({
      data: null,
      error: new Error("Profile update rejected"),
    });
    mocks.supabase.from
      .mockReturnValueOnce(initialQuery)
      .mockReturnValueOnce(updateQuery);
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("profile-name").textContent).toBe("Runner")
    );

    await expect(
      latestAuth?.updateProfile({ name: "Rejected Runner" })
    ).rejects.toThrow("Failed to update profile: Profile update rejected");
  });

  test("signInWithGoogle redirects to the callback with a safe next path", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    window.history.replaceState(null, "", "/login?next=/runs");
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signInWithGoogle();
    });

    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Fruns&login=google",
      },
    });
  });

  test("signInWithStrava redirects to the custom Strava provider callback", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    window.history.replaceState(null, "", "/login?next=/runs");
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signInWithStrava();
    });

    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "custom:strava",
      options: {
        queryParams: {
          approval_prompt: "force",
        },
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Fruns&login=strava",
      },
    });
  });

  test("signInWithGoogle throws a meaningful Supabase auth error", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.supabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: new Error("OAuth provider unavailable"),
    });
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    await expect(latestAuth?.signInWithGoogle()).rejects.toThrow(
      "Failed to sign in with Google: OAuth provider unavailable"
    );
  });

  test("signOut calls Supabase sign out and redirects to login", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const assign = stubLocationAssign();
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      await latestAuth?.signOut();
    });

    expect(mocks.supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/login");
  });

  test("signOut throws a meaningful Supabase auth error", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.supabase.auth.signOut.mockResolvedValue({
      error: new Error("Session expired"),
    });
    const assign = stubLocationAssign();
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    await expect(latestAuth?.signOut()).rejects.toThrow(
      "Failed to sign out: Session expired"
    );
    expect(assign).not.toHaveBeenCalled();
  });

  test("signIn throws a meaningful Supabase auth error", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: new Error("Invalid login credentials"),
    });
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    await expect(
      latestAuth?.signIn("runner@example.com", "wrong-password")
    ).rejects.toThrow("Failed to sign in: Invalid login credentials");
  });

  test("auth state changes refresh the user profile", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const profileQuery = makeProfileSelectQuery({ data: profile, error: null });
    mocks.supabase.from.mockReturnValue(profileQuery);
    let latestAuth: ReturnType<typeof useAuth> | null = null;

    render(<AuthProbe onRender={(auth) => (latestAuth = auth)} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      authChangeCallback?.("SIGNED_IN", { user });
    });

    await waitFor(() =>
      expect(screen.getByTestId("profile-name").textContent).toBe("Runner")
    );
    expect(latestAuth?.user).toBe(user);
    expect(profileQuery.eq).toHaveBeenCalledWith("id", user.id);
  });

  test("initial profile fetch failure clears loading without an unhandled rejection", async () => {
    const profileQuery = makeProfileSelectQuery({
      data: null,
      error: new Error("Profile unavailable"),
    });
    mocks.supabase.from.mockReturnValue(profileQuery);

    render(<AuthProbe onRender={() => undefined} />);

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    expect(screen.getByTestId("profile-name").textContent).toBe("none");
  });

  test("sign out during pending initial profile load does not leave a stale profile", async () => {
    const profileResult = deferred<{ data: Profile; error: null }>();
    const profileQuery = makeProfileSelectQuery({ data: profile, error: null });
    profileQuery.single.mockImplementation(
      async () => await profileResult.promise
    );
    mocks.supabase.from.mockReturnValue(profileQuery);

    render(<AuthProbe onRender={() => undefined} />);
    await act(async () => {
      authChangeCallback?.("SIGNED_OUT", null);
    });
    expect(screen.getByTestId("profile-name").textContent).toBe("none");

    await act(async () => {
      profileResult.resolve({ data: profile, error: null });
    });

    expect(screen.getByTestId("profile-name").textContent).toBe("none");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  test("unmount during pending auth-state profile load does not reject or set state", async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const profileResult = deferred<{
      data: Profile | null;
      error: Error | null;
    }>();
    const profileQuery = makeProfileSelectQuery({ data: profile, error: null });
    profileQuery.single.mockImplementation(
      async () => await profileResult.promise
    );
    mocks.supabase.from.mockReturnValue(profileQuery);
    const onRender = vi.fn();

    const { unmount } = render(<AuthProbe onRender={onRender} />);
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    await act(async () => {
      authChangeCallback?.("SIGNED_IN", { user });
    });
    const renderCountBeforeUnmount = onRender.mock.calls.length;

    unmount();
    await act(async () => {
      profileResult.reject(new Error("Profile fetch failed after unmount"));
    });

    expect(onRender).toHaveBeenCalledTimes(renderCountBeforeUnmount);
  });

  test("INITIAL_SESSION does not duplicate the explicit initial profile load", async () => {
    const profileQuery = makeProfileSelectQuery({ data: profile, error: null });
    mocks.supabase.from.mockReturnValue(profileQuery);

    render(<AuthProbe onRender={() => undefined} />);
    await waitFor(() =>
      expect(screen.getByTestId("profile-name").textContent).toBe("Runner")
    );
    await act(async () => {
      authChangeCallback?.("INITIAL_SESSION", { user });
    });

    expect(profileQuery.single).toHaveBeenCalledTimes(1);
    expect(mocks.withSupabaseRetry).toHaveBeenCalledTimes(1);
  });
});
