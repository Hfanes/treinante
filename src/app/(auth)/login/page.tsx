import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSafeNextPath } from "@/lib/auth-redirects";
import { createServerClient } from "@/lib/supabase-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = getSafeNextPath(next);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthForm mode="login" next={safeNext} />
    </main>
  );
}
