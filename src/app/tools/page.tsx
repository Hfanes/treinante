import { PageShell } from "@/components/layout/page-shell";
import { MobileNavClient } from "@/components/layout/mobile-nav-client";
import { Sidebar } from "@/components/layout/sidebar";
import { TrainingToolsClient } from "@/components/tools/training-tools-client";
import { Card } from "@/components/ui";
import { createServerClient } from "@/lib/supabase-server";

async function getLoggedInState() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return Boolean(user);
  } catch {
    return false;
  }
}

export default async function ToolsPage() {
  const isLoggedIn = await getLoggedInState();

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar />
      <PageShell title="Training Tools">
        <div className="grid gap-5">
          <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
            <h2 className="instrument-heading max-w-5xl text-4xl leading-[0.95] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl lg:text-8xl">
              Every calculation,{" "}
              <em className="font-normal text-[var(--primary)]">
                close at hand.
              </em>
            </h2>
          </section>

          {!isLoggedIn ? (
            <Card subtitle="Want saved zones, race predictions, and your full training history? Sign up to turn these tools into a training cockpit.">
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-medium !text-[var(--primary-foreground)] no-underline transition hover:opacity-90"
                  href="/signup"
                >
                  Sign up
                </a>
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm font-medium text-[var(--bone)] no-underline transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  href="/login"
                >
                  Login
                </a>
              </div>
            </Card>
          ) : null}
          <TrainingToolsClient isLoggedIn={isLoggedIn} />
        </div>
      </PageShell>
      <MobileNavClient />
    </div>
  );
}
