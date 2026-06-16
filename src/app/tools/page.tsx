import { PageShell } from "@/components/layout/page-shell";
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
    <PageShell title="Training Tools">
      <div className="grid gap-5">
        <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
          <h2 className="instrument-heading max-w-5xl text-6xl leading-[0.92] tracking-[-0.03em] text-[var(--primary)] sm:text-7xl lg:text-8xl">
            Every calculation,{" "}
            <em className="font-normal text-[var(--primary)]">
              close at hand.
            </em>
          </h2>
        </section>

        {!isLoggedIn ? (
          <Card subtitle="Sign in to save your zone settings and personalise predictions. All calculators work without an account." />
        ) : null}
        <TrainingToolsClient isLoggedIn={isLoggedIn} />
      </div>
    </PageShell>
  );
}
