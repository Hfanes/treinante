import { PageShell } from "@/components/layout/page-shell";
import { AccountSecurityForm } from "@/components/settings/account-security-form";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { StravaIntegrationCard } from "@/components/settings/strava-integration-card";
import { Card } from "@/components/ui";
import { createServerClient } from "@/lib/supabase-server";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

function authProviders(user: User | null) {
  const providers = new Set<string>();

  for (const identity of user?.identities ?? []) {
    if (identity.provider === "custom:strava") {
      providers.add("strava");
    } else if (identity.provider) {
      providers.add(identity.provider);
    }
  }

  const primaryProvider = user?.app_metadata.provider;
  if (primaryProvider === "custom:strava") {
    providers.add("strava");
  } else if (typeof primaryProvider === "string") {
    providers.add(primaryProvider);
  }

  if (providers.size === 0 && user?.email) {
    providers.add("email");
  }

  return Array.from(providers);
}

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
        <div className="grid gap-4">
          <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
            <h2 className="instrument-heading max-w-5xl text-4xl leading-[0.95] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl lg:text-8xl">
              Settings.{" "}
              <em className="font-normal text-[var(--primary)] ">
                Tune the athlete.
              </em>
            </h2>
          </section>

          <AccountSettingsForm profile={profile as Profile} />
          <AccountSecurityForm
            authProviders={authProviders(user)}
            email={user?.email ?? null}
          />
          <StravaIntegrationCard profile={profile as Profile} />
        </div>
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
