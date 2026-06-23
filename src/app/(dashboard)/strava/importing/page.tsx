import { PageShell } from "@/components/layout/page-shell";
import { StravaImportingClient } from "@/components/strava-importing-client";
import { getSafeNextPath } from "@/lib/auth-redirects";

export default async function StravaImportingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <PageShell title="Importing Runs" eyebrow="Strava">
      <StravaImportingClient next={getSafeNextPath(next)} />
    </PageShell>
  );
}
