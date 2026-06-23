"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import {
  getOAuthCallbackUrl,
  getSafeNextPath,
  lastLoginCookieValue,
} from "@/lib/auth-redirects";
import { createBrowserClient } from "@/lib/supabase";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import type { Profile } from "@/types";

interface UseAuthResult {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithStrava: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
}

function toError(message: string, error: unknown) {
  if (error instanceof Error) {
    return new Error(`${message}: ${error.message}`);
  }

  if (error && typeof error === "object" && "message" in error) {
    return new Error(`${message}: ${String(error.message)}`);
  }

  return new Error(message);
}

export function useAuth(): UseAuthResult {
  const [supabase] = useState(createBrowserClient);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await withSupabaseRetry(
        async () =>
          await supabase.from("profiles").select("*").eq("id", userId).single()
      );

      if (error) {
        throw toError("Failed to load profile", error);
      }

      return data as Profile;
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    let authGeneration = 0;
    let currentUserId: string | null = null;

    async function loadProfileFor(userId: string) {
      const requestId = ++profileRequestId.current;
      setLoading(true);

      try {
        const nextProfile = await fetchProfile(userId);

        if (
          active &&
          profileRequestId.current === requestId &&
          currentUserId === userId
        ) {
          setProfile(nextProfile);
          setLoading(false);
        }
      } catch {
        if (
          active &&
          profileRequestId.current === requestId &&
          currentUserId === userId
        ) {
          setProfile(null);
          setLoading(false);
        }
      }
    }

    async function loadUser() {
      const initialAuthGeneration = authGeneration;
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          throw toError("Failed to load authenticated user", error);
        }

        if (!active || authGeneration !== initialAuthGeneration) {
          return;
        }

        currentUserId = data.user?.id ?? null;
        setUser(data.user);

        if (!data.user) {
          profileRequestId.current++;
          setProfile(null);
          setLoading(false);
          return;
        }

        await loadProfileFor(data.user.id);
      } catch {
        if (!active) {
          return;
        }

        currentUserId = null;
        profileRequestId.current++;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      const nextUser = session?.user ?? null;
      authGeneration++;
      currentUserId = nextUser?.id ?? null;
      setUser(nextUser);

      if (!nextUser) {
        profileRequestId.current++;
        setProfile(null);
        setLoading(false);
        return;
      }

      void loadProfileFor(nextUser.id);
    });

    return () => {
      active = false;
      profileRequestId.current++;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw toError("Failed to sign in", error);
      }

      document.cookie = lastLoginCookieValue("email");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(getSafeNextPath(next));
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        throw toError("Failed to sign up", error);
      }

      if (data.session) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.assign(getSafeNextPath(next));
      }
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    const next = new URLSearchParams(window.location.search).get("next");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${getOAuthCallbackUrl("google", next)}`,
      },
    });

    if (error) {
      throw toError("Failed to sign in with Google", error);
    }
  }, [supabase]);

  const signInWithStrava = useCallback(async () => {
    const next = new URLSearchParams(window.location.search).get("next");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "custom:strava",
      options: {
        queryParams: {
          approval_prompt: "force",
        },
        redirectTo: `${window.location.origin}${getOAuthCallbackUrl("strava", next)}`,
      },
    });

    if (error) {
      throw toError("Failed to sign in with Strava", error);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw toError("Failed to sign out", error);
    }

    window.location.assign("/login");
  }, [supabase]);

  const updateProfile = useCallback(
    async (profileUpdate: Partial<Profile>) => {
      if (!user) {
        throw new Error("Cannot update profile without an authenticated user");
      }

      const { data, error } = await withSupabaseRetry(
        async () =>
          await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("id", user.id)
            .select("*")
            .single()
      );

      if (error) {
        throw toError("Failed to update profile", error);
      }

      setProfile(data as Profile);
    },
    [supabase, user]
  );

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithStrava,
    signOut,
    updateProfile,
  };
}
