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
    description:
      "Stress score for one run: duration in hours x intensity ratio x intensity factor x 100.",
    intervals: [
      "0-30: easy or short; good for recovery days.",
      "31-70: moderate; useful daily training load for many runners.",
      "71-120: hard or long; productive when planned, costly if repeated too often.",
      "120+: very demanding; needs recovery because fatigue rises fast.",
    ],
  },
  {
    abbreviation: "ATL",
    name: "Acute Training Load",
    description:
      "Short-term fatigue from recent training, weighted over 7 days.",
    intervals: [
      "Rising ATL: you are adding fatigue now; good during a build block.",
      "Flat ATL: load is stable; useful for maintenance.",
      "Falling ATL: fatigue is clearing; good before races or after hard blocks.",
      "ATL much higher than CTL: short-term load is outrunning your base, so injury and burnout risk increase.",
    ],
  },
  {
    abbreviation: "CTL",
    name: "Chronic Training Load",
    description:
      "Long-term fitness from accumulated training, weighted over 42 days.",
    intervals: [
      "Rising slowly: fitness is building; usually good if ATL is controlled.",
      "Flat: fitness is being maintained.",
      "Falling: recent training is below your previous base; fine for recovery, not for building.",
      "Fast jumps: not automatically good; CTL lags, so ATL and TSB reveal the recovery cost.",
    ],
  },
  {
    abbreviation: "TSB",
    name: "Training Stress Balance",
    description:
      "Current form: CTL minus ATL. Positive means fresher; negative means more fatigued.",
    intervals: [
      "+15 or more: very fresh; good for racing, but may mean detraining if it stays high.",
      "+5 to +15: optimal; fresh enough for quality work.",
      "-10 to +5: neutral; normal day-to-day training range.",
      "-20 to -10: fatigued; okay in a planned build, but watch recovery.",
      "Below -20: overreaching; bad if sustained because fatigue is outpacing fitness.",
    ],
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
  const latestRunUpdate = typedRuns
    .map((run) => run.updated_at)
    .sort()
    .at(-1);
  const latestSnapshotUpdate = typedRuns
    .filter((run) => run.tsb_at_date !== null)
    .map((run) => run.updated_at)
    .sort()
    .at(-1);
  const needsStaleRefresh = Boolean(
    latestRunUpdate &&
    latestSnapshotUpdate &&
    latestRunUpdate > latestSnapshotUpdate
  );
  const series: FitnessPoint[] =
    typedProfile && typedRuns.length > 0 && (needsBackfill || needsStaleRefresh)
      ? await recalculateFitnessSnapshots(supabase, user.id)
      : computeFitnessTimeSeries(typedRuns, typedProfile);
  const current = series.at(-1);
  const insights = generateFitnessInsights(series);

  return (
    <PageShell title="Fitness">
      <div className="grid gap-5">
        <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
          <h2 className="instrument-heading max-w-5xl text-4xl leading-[0.95] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl lg:text-8xl">
            The shape{" "}
            <em className="font-normal text-[var(--primary)]">of your year.</em>
          </h2>
        </section>

        <Card subtitle="How each fitness metric is calculated, what the ranges mean, and why higher is not always better.">
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
                <dd className="mt-2 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>{term.description}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {term.intervals.map((interval) => (
                      <li key={interval}>{interval}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </Card>

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
