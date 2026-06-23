import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AuthForm } from "@/components/auth/auth-form";
import {
  LAST_LOGIN_COOKIE,
  getSafeNextPath,
  isLoginMethod,
} from "@/lib/auth-redirects";
import { createServerClient } from "@/lib/supabase-server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = getSafeNextPath(next);
  const cookieStore = await cookies();
  const lastLogin = cookieStore.get(LAST_LOGIN_COOKIE)?.value;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthForm
        lastLoginMethod={isLoginMethod(lastLogin) ? lastLogin : null}
        mode="signup"
        next={safeNext}
      />
    </main>
  );
}
