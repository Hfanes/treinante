import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { createServerClient } from "@/lib/supabase-server";

export default async function ForgotPasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/settings");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <ForgotPasswordForm />
    </main>
  );
}
