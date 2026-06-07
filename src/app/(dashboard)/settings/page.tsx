import { PageShell } from "@/components/layout/page-shell";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { Card } from "@/components/ui";
import { createServerClient } from "@/lib/supabase-server";
import type { Profile } from "@/types";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <PageShell title="Settings">
      {profile ? (
        <AccountSettingsForm profile={profile as Profile} />
      ) : (
        <Card subtitle="Your account profile could not be loaded.">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Try refreshing the page.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
