import {
  ManualRaceCalculator,
  PredictorExplanationToggle,
} from "@/components/predictor/race-predictor-client";
import { PageShell } from "@/components/layout/page-shell";
import { Badge, Card } from "@/components/ui";
import {
  buildMonthlyVo2Trend,
  buildVo2RacePredictions,
  findBestPredictorAnchor,
  getWorkingVo2max,
  vo2maxFromHr,
  vo2maxFromPace,
  type PredictorAnchor,
} from "@/lib/calculations";
import { formatDuration, formatPace } from "@/lib/runAnalysis";
import { createServerClient } from "@/lib/supabase-server";
import type { PersonalRecord, Profile, Run } from "@/types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatMonthLabel(month: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function formatDelta(seconds: number) {
  const prefix = seconds > 0 ? "+" : "-";
  return `${prefix}${formatDuration(Math.abs(seconds))} vs PR`;
}

function formatBest(time: number | null) {
  return time ? formatDuration(time) : "-";
}

function anchorLabel(anchor: PredictorAnchor) {
  const source = anchor.source === "rolling" ? "rolling window" : "whole run";
  return `${anchor.distance.toFixed(1)} km ${source} from ${formatDate(anchor.runDate)}`;
}

interface ReliabilityFlag {
  title: string;
  body?: string[];
}

function reliabilityFlags({
  anchor,
  runs,
  paceVo2max,
  hrVo2max,
  maxHr,
  maxHrSource,
  restingHr,
}: {
  anchor: PredictorAnchor | null;
  runs: Run[];
  paceVo2max: number | null;
  hrVo2max: number | null;
  maxHr: number | null;
  maxHrSource: string | null;
  restingHr: number | null;
}) {
  const flags: ReliabilityFlag[] = [];

  if (runs.length === 0) {
    flags.push({ title: "Import at least one run for automatic predictions." });
  } else if (runs.every((run) => run.source === "manual")) {
    flags.push({
      title:
        "GPS data needed for automatic predictions - Section 3 calculator works without it.",
    });
  }

  if (anchor && anchor.distance < 3) {
    flags.push({
      title:
        "Short efforts give rough estimates - a 5k+ effort improves accuracy.",
    });
  }
  if (anchor && anchor.source === "whole-run") {
    flags.push({
      title:
        "No clean rolling window found - using the best whole-run average pace.",
    });
  }
  if (
    paceVo2max !== null &&
    hrVo2max !== null &&
    Math.abs(paceVo2max - hrVo2max) > 5
  ) {
    const divergence = Math.abs(paceVo2max - hrVo2max);
    flags.push(
      maxHr && maxHr > 195
        ? {
            title: `Methods differ by ${divergence.toFixed(1)} pts - pace-based used as working estimate.`,
            body: [
              `The HR formula (15 x max HR / resting HR) was validated on average populations with typical max HR ranges. At ${maxHr} bpm it tends to overestimate - this is a known limitation for athletes with high max HR, not necessarily a data error.`,
              `If ${maxHr} bpm is your true max HR, trust the pace-based estimate (${paceVo2max.toFixed(1)}). It is derived from your actual performance and is more reliable in your case.`,
              "Your pace-based estimate will improve as you log harder efforts.",
            ],
          }
        : {
            title: `Methods differ by ${divergence.toFixed(1)} pts - pace-based used as working estimate.`,
            body: [
              "This usually means max HR or resting HR is not quite right.",
              `Check that both values reflect actual measurements: Max HR ${maxHr ?? "-"} bpm from ${maxHrSource ?? "unknown source"}; Resting HR ${restingHr ?? "-"} bpm from Settings.`,
              `Your pace-based estimate (${paceVo2max.toFixed(1)}) is derived from actual performance and is reliable regardless of HR settings.`,
            ],
          }
    );
  }

  return flags;
}

function bestRunMaxHr(runs: Run[]) {
  const values = runs
    .map((run) => run.max_hr)
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : null;
}

function hrSourceLabel(source: string | null, maxHr: number | null) {
  if (!source || !maxHr) return null;
  return source === "profile"
    ? `Settings max HR (${maxHr})`
    : `run history max HR (${maxHr})`;
}

function recentRunMonthCount(runs: Run[], today = new Date()) {
  const cutoff = new Date(today);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return new Set(
    runs
      .filter((run) => run.date >= cutoffIso)
      .map((run) => run.date.slice(0, 7))
  ).size;
}

function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function trendInsight(
  trend: Array<{ month: string; vo2max: number }>,
  currentMonth: string
) {
  const lastComplete = [...trend]
    .filter((point) => point.month < currentMonth)
    .at(-1);
  if (!lastComplete) return null;

  const comparisonMonth = shiftMonth(lastComplete.month, -3);
  const comparison = trend.find((point) => point.month === comparisonMonth);
  if (!comparison) return null;

  const change = lastComplete.vo2max - comparison.vo2max;
  if (Math.abs(change) < 1) {
    return `Holding steady over the last 3 months (${comparison.month} to ${lastComplete.month}).`;
  }

  return change > 0
    ? `Fitness up ${change.toFixed(1)} points over the last 3 months (${comparison.month} to ${lastComplete.month}).`
    : `Fitness has dipped ${Math.abs(change).toFixed(1)} points over the last 3 months (${comparison.month} to ${lastComplete.month}).`;
}

function Vo2TrendChart({
  trend,
  runMonthCount,
  currentMonth,
}: {
  trend: Array<{ month: string; vo2max: number }>;
  runMonthCount: number;
  currentMonth: string;
}) {
  if (trend.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Trend appears after 3 months with valid anchor efforts. Current data has{" "}
        {runMonthCount} month{runMonthCount === 1 ? "" : "s"} with runs, but no
        valid VO2max anchor months yet.
      </p>
    );
  }

  const values = trend.map((point) => point.vo2max);
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const range = Math.max(1, max - min);
  const insight = trendInsight(trend, currentMonth);
  const points = trend.map((point, index) => {
    const x = trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100;
    const y = 100 - ((point.vo2max - min) / range) * 100;
    return { ...point, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="grid gap-3">
      <div className="rounded-[2px] border border-[var(--border)] p-3">
        <div className="relative h-36">
          <svg
            aria-label="VO2max trend"
            className="pointer-events-none h-full w-full overflow-visible"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            <polyline
              fill="none"
              points={polyline}
              stroke="var(--chart-pace)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((point, index) => {
            const previousX = points[index - 1]?.x ?? 0;
            const nextX = points[index + 1]?.x ?? 100;
            const left = index === 0 ? 0 : (previousX + point.x) / 2;
            const right =
              index === points.length - 1 ? 100 : (point.x + nextX) / 2;
            const hitX = ((point.x - left) / (right - left)) * 100;

            return (
              <span
                aria-label={`${point.month}: ${point.vo2max.toFixed(1)} VO2max`}
                className="group absolute top-0 h-full"
                key={point.month}
                style={{ left: `${left}%`, width: `${right - left}%` }}
              >
                <span
                  className="pointer-events-none absolute z-10 w-max -translate-x-1/2 -translate-y-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--bone)] opacity-0 transition group-hover:opacity-100"
                  style={{ left: `${hitX}%`, top: `${point.y}%` }}
                >
                  {point.month} · {point.vo2max.toFixed(1)} VO2max
                </span>
              </span>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between gap-2">
          {points.map((point) => (
            <div className="text-center" key={point.month}>
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {formatMonthLabel(point.month)}
              </div>
              <div className="mt-1 font-mono text-[0.68rem] text-[var(--bone)]">
                VO2 {point.vo2max.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {insight ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">{insight}</p>
      ) : null}
      {trend.length < 3 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Showing available VO2max anchor month{trend.length === 1 ? "" : "s"}.
          Full trend appears after 3 valid months.
        </p>
      ) : null}
    </div>
  );
}

export default async function PredictorPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: runs }, { data: records }, { data: profile }] =
    await Promise.all([
      supabase.from("runs").select("*").order("date", { ascending: false }),
      supabase.from("personal_records").select("*").order("type"),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);
  const typedRuns = (runs ?? []) as unknown as Run[];
  const typedRecords = (records ?? []) as unknown as PersonalRecord[];
  const typedProfile = profile as Profile | null;
  const anchor = findBestPredictorAnchor(typedRuns);
  const profileMaxHr = typedProfile?.max_hr ?? null;
  const runMaxHr = bestRunMaxHr(typedRuns);
  const hrMaxSource = profileMaxHr
    ? "profile"
    : runMaxHr
      ? "run history"
      : null;
  const paceVo2max = anchor
    ? vo2maxFromPace(anchor.time, anchor.distance)
    : null;
  const hrVo2max = vo2maxFromHr(
    profileMaxHr ?? runMaxHr,
    typedProfile?.resting_hr ?? null
  );
  const hrSource = hrSourceLabel(hrMaxSource, profileMaxHr ?? runMaxHr);
  const workingVo2max = getWorkingVo2max(paceVo2max, hrVo2max);
  const predictions = workingVo2max
    ? buildVo2RacePredictions(workingVo2max, typedRecords)
    : [];
  const flags = reliabilityFlags({
    anchor,
    runs: typedRuns,
    paceVo2max,
    hrVo2max,
    maxHr: profileMaxHr ?? runMaxHr,
    maxHrSource: hrSource,
    restingHr: typedProfile?.resting_hr ?? null,
  });
  const trend = buildMonthlyVo2Trend(typedRuns);
  const runMonthCount = recentRunMonthCount(typedRuns);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const initialDistance = anchor?.distance ?? 10;
  const initialTime = anchor?.time ?? 45 * 60;

  return (
    <PageShell title="Race Predictor">
      <div className="grid gap-5">
        <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
          <h2 className="instrument-heading max-w-5xl text-4xl leading-[0.95] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl lg:text-8xl">
            From one effort,{" "}
            <em className="font-normal text-[var(--primary)]">
              the whole season.
            </em>
          </h2>
        </section>

        <Card
          className="vbars overflow-hidden bg-[color-mix(in_oklch,var(--background)_84%,black)]"
          subtitle="Training reference only - not a medical measurement."
        >
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="ui-label">Working VO2max</p>
              <div className="instrument-heading mt-4 mb-4 text-6xl leading-none text-[var(--primary)] sm:text-7xl md:text-8xl">
                {workingVo2max?.toFixed(1) ?? "-"}
              </div>
              <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--secondary)]">
                ml/kg/min · current estimate
              </p>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border-l border-[var(--border)] pl-4">
                  <p className="ui-label">Pace model</p>
                  <p className="mt-3 font-mono text-2xl text-[var(--bone)]">
                    {paceVo2max?.toFixed(1) ?? "-"}
                  </p>
                </div>
                <div className="border-l border-[var(--border)] pl-4">
                  <p className="ui-label">HR model</p>
                  <p className="mt-3 font-mono text-2xl text-[var(--bone)]">
                    {hrVo2max?.toFixed(1) ?? "-"}
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                    {hrSource
                      ? `Uses ${hrSource} + resting HR`
                      : "Set max HR + resting HR"}
                  </p>
                </div>
                <div className="border-l border-[var(--border)] pl-4">
                  <p className="ui-label">Reference</p>
                  <div className="mt-3 grid gap-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    <span>
                      <span className="text-[var(--bone)]">35-45</span>{" "}
                      recreational
                    </span>
                    <span>
                      <span className="text-[var(--bone)]">50-60</span> amateur
                    </span>
                    <span>
                      <span className="text-[var(--bone)]">70+</span> elite
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-5">
                {anchor ? (
                  <>
                    <p className="max-w-3xl text-sm leading-6 text-[var(--foreground)]">
                      Based on {anchorLabel(anchor)} at{" "}
                      {formatPace(anchor.pace)}. Rolling anchors scan recent
                      splits for the best clean 21 km, 10 km, 5 km, then 3 km
                      effort.
                    </p>
                    <PredictorExplanationToggle
                      anchorLabel={anchorLabel(anchor)}
                      anchorPace={formatPace(anchor.pace)}
                    />
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Import runs to see your VO2max estimate.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card subtitle="Pace-based VO2max per month over the last 6 months.">
          <h2 className="font-semibold text-gray-950 dark:text-white">
            VO2max trend
          </h2>
          <div className="mt-4">
            <Vo2TrendChart
              currentMonth={currentMonth}
              trend={trend}
              runMonthCount={runMonthCount}
            />
          </div>
        </Card>

        <Card subtitle="Automatic projections from the working VO2max estimate.">
          <h2 className="font-semibold text-gray-950 dark:text-white">
            Predicted race times
          </h2>
          {flags.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
              <ul className="grid gap-4">
                {flags.map((flag) => (
                  <li key={flag.title}>
                    <p className="font-medium">{flag.title}</p>
                    {flag.body ? (
                      <div className="mt-2 grid gap-2">
                        {flag.body.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {predictions.length > 0 ? (
            <div className="mt-4">
              <div className="grid gap-3 md:hidden">
                {predictions.map((prediction) => (
                  <article
                    className="rounded-[2px] border border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_92%,black)] p-3"
                    key={prediction.key}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--bone)]">
                          {prediction.label}
                        </p>
                        <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                          {prediction.distance.toFixed(3).replace(/\.0+$/, "")}{" "}
                          km
                        </p>
                      </div>
                      {prediction.prGap !== null ? (
                        <Badge
                          variant={prediction.prGap < 0 ? "optimal" : "neutral"}
                        >
                          {formatDelta(prediction.prGap)}
                        </Badge>
                      ) : null}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="ui-label">Predicted</dt>
                        <dd className="mt-1 font-mono text-[var(--bone)]">
                          {prediction.predictedTime
                            ? formatDuration(prediction.predictedTime)
                            : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="ui-label">Pace</dt>
                        <dd className="mt-1 font-mono text-[var(--bone)]">
                          {prediction.pace ? formatPace(prediction.pace) : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="ui-label">Personal best</dt>
                        <dd className="mt-1 font-mono text-[var(--bone)]">
                          {formatBest(prediction.prTime)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2">Distance</th>
                      <th>km</th>
                      <th>Predicted time</th>
                      <th>Pace</th>
                      <th>Personal best</th>
                      <th>PR delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {predictions.map((prediction) => (
                      <tr key={prediction.key}>
                        <td className="py-3 font-medium text-gray-950 dark:text-white">
                          {prediction.label}
                        </td>
                        <td>
                          {prediction.distance.toFixed(3).replace(/\.0+$/, "")}
                        </td>
                        <td>
                          {prediction.predictedTime
                            ? formatDuration(prediction.predictedTime)
                            : "-"}
                        </td>
                        <td>
                          {prediction.pace ? formatPace(prediction.pace) : "-"}
                        </td>
                        <td>{formatBest(prediction.prTime)}</td>
                        <td>
                          {prediction.prGap !== null ? (
                            <Badge
                              variant={
                                prediction.prGap < 0 ? "optimal" : "neutral"
                              }
                            >
                              {formatDelta(prediction.prGap)}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Model · Riegel exponent 1.06 · Assumes equal fitness and flat
                course.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Import runs for automatic predictions.
            </p>
          )}
        </Card>

        <ManualRaceCalculator
          initialDistance={initialDistance}
          initialTime={initialTime}
        />
      </div>
    </PageShell>
  );
}
