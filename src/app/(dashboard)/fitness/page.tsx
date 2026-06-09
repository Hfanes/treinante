import { FitnessCharts } from "@/components/fitness/fitness-charts";
import { PageShell } from "@/components/layout/page-shell";
import { Badge, Card } from "@/components/ui";
import {
  computeFitnessTimeSeries,
  countTrainingDays,
  generateFitnessInsights,
  getCurrentFormLabel,
  getFormVariant,
  hasOverreachingStreak,
  recalculateFitnessSnapshots,
} from "@/lib/calculations";
import { createServerClient } from "@/lib/supabase-server";
import type { FitnessPoint, Profile, Run } from "@/types";

const FITNESS_TERMS = [
  {
    abbreviation: "TL",
    name: "Training Load",
    description: "Stress score for one run, based on duration and intensity.",
  },
  {
    abbreviation: "ATL",
    name: "Acute Training Load",
    description:
      "Short-term fatigue from recent training, weighted over 7 days.",
  },
  {
    abbreviation: "CTL",
    name: "Chronic Training Load",
    description:
      "Long-term fitness from accumulated training, weighted over 42 days.",
  },
  {
    abbreviation: "TSB",
    name: "Training Stress Balance",
    description:
      "Current form: CTL minus ATL. Positive means fresher; negative means more fatigued.",
  },
];

function formatSigned(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export default async function FitnessPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: runs }, { data: profile }] = await Promise.all([
    supabase.from("runs").select("*").order("date"),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);
  const typedRuns = (runs ?? []) as unknown as Run[];
  const typedProfile = profile as Profile | null;
  const trainingDays = countTrainingDays(typedRuns);
  const needsBackfill = typedRuns.some(
    (run) =>
      run.training_load === null ||
      run.ctl_at_date === null ||
      run.atl_at_date === null ||
      run.tsb_at_date === null
  );
  const series: FitnessPoint[] =
    typedProfile && typedRuns.length > 0 && needsBackfill
      ? await recalculateFitnessSnapshots(supabase, user.id)
      : computeFitnessTimeSeries(typedRuns, typedProfile);
  const current = series.at(-1);
  const insights = generateFitnessInsights(series);

  return (
    <PageShell title="Fitness">
      <div className="grid gap-5">
        {trainingDays < 7 || !current ? (
          <Card subtitle="Keep running - fitness and fatigue tracking fills in after a week of data.">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {trainingDays} of 7 training days logged.
            </p>
          </Card>
        ) : (
          <>
            {hasOverreachingStreak(series) ? (
              <Card className="border-amber-300 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  You&apos;ve been overreaching for 3 days. Reducing load now
                  helps avoid injury and fatigue accumulation.
                </p>
              </Card>
            ) : null}

            <section className="grid gap-3 md:grid-cols-4">
              <Card
                label="Current form"
                value={formatSigned(current.tsb)}
                subtitle="TSB = CTL - ATL"
              >
                <div className="mt-3">
                  <Badge variant={getFormVariant(current.tsb)}>
                    {getCurrentFormLabel(current.tsb)}
                  </Badge>
                </div>
              </Card>
              <Card
                label="Fitness"
                value={current.ctl.toFixed(1)}
                subtitle="CTL, 42-day weighted load"
              />
              <Card
                label="Fatigue"
                value={current.atl.toFixed(1)}
                subtitle="ATL, 7-day weighted load"
              />
              <Card
                label="Training days"
                value={trainingDays}
                subtitle="7-day minimum is active app-wide"
              />
            </section>

            <Card subtitle="Performance Management Chart. Drag or wheel over charts to inspect dense periods; use range controls to keep both views aligned.">
              <FitnessCharts points={series} />
            </Card>

            <Card subtitle="How to read the fitness and freshness abbreviations.">
              <h2 className="font-semibold text-gray-950 dark:text-white">
                Metric glossary
              </h2>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                {FITNESS_TERMS.map((term) => (
                  <div
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                    key={term.abbreviation}
                  >
                    <dt className="font-mono text-sm font-semibold text-gray-950 dark:text-white">
                      {term.abbreviation} - {term.name}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {term.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card subtitle="Rule-based reads from the current fitness series.">
              <h2 className="font-semibold text-gray-950 dark:text-white">
                Insights
              </h2>
              <ul className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-300">
                {insights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
