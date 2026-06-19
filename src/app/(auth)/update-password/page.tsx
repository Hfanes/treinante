import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { createServerClient } from "@/lib/supabase-server";

export default async function UpdatePasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <UpdatePasswordForm />
    </main>
  );
}
