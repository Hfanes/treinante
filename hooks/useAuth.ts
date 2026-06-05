"use client";

import type { Profile } from "@/types";

export function useAuth(): {
  user: null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
} {
  const unimplemented = async () => {
    throw new Error("Auth flow is not implemented yet");
  };

  return {
    user: null,
    profile: null,
    loading: false,
    signIn: unimplemented,
    signUp: unimplemented,
    signInWithGoogle: unimplemented,
    signOut: unimplemented,
    updateProfile: unimplemented,
  };
}
