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
        {!isLoggedIn ? (
          <Card subtitle="Sign in to save your zone settings and personalise predictions. All calculators work without an account." />
        ) : null}
        <TrainingToolsClient isLoggedIn={isLoggedIn} />
      </div>
    </PageShell>
  );
}
