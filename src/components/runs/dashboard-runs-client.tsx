"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  FitnessPreviewChart,
  HrTrendChart,
  PaceTrendChart,
} from "@/components/dashboard/dashboard-charts";
import { Card } from "@/components/ui";
import { getCachedRuns, upsertCachedRuns } from "@/lib/idb";
import {
  buildDashboardData,
  formatDashboardPace,
  type WeeklyBucket,
} from "@/lib/dashboardAnalysis";
import {
  buildPrBadgeMap,
  formatPrBadgeLabel,
  type PersonalRecordBadgeRecord,
} from "@/lib/personalRecordLabels";
import type { Profile, Run } from "@/types";

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-medium !text-[var(--primary-foreground)] no-underline transition hover:opacity-90";
const secondaryActionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm font-medium text-[var(--bone)] no-underline transition hover:border-[var(--primary)] hover:text-[var(--primary)]";
const ghostActionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[2px] px-4 py-2 text-sm font-medium text-[var(--secondary)] no-underline transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]";

type SummaryRange = "week" | "month" | "90d" | "year";

const summaryRanges: Array<{ key: SummaryRange; label: string }> = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "90d", label: "Last 90 days" },
  { key: "year", label: "This Year" },
];

function formatMetric(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(
    value
  );
}

function formatDurationShort(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function startOfCurrentWeek() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start.toISOString().slice(0, 10);
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function startOfYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    .toISOString()
    .slice(0, 10);
}

function daysAgo(days: number) {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function rangeStart(range: SummaryRange) {
  if (range === "week") return startOfCurrentWeek();
  if (range === "month") return startOfMonth();
  if (range === "90d") return daysAgo(89);
  return startOfYear();
}

function JournalMetric({
  label,
  unit,
  value,
}: {
  label: string;
  unit?: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="ui-label">{label}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="instrument-heading text-4xl leading-none">
          {value}
        </span>
        {unit ? <span className="metric-unit">{unit}</span> : null}
      </div>
    </div>
  );
}

function selectedRangeSummary(runs: Run[], range: SummaryRange) {
  const selectedRuns = runs.filter((run) => run.date >= rangeStart(range));
  const distance = selectedRuns.reduce((sum, run) => sum + run.distance, 0);
  const totalTime = selectedRuns.reduce((sum, run) => sum + run.moving_time, 0);
  const elevation = selectedRuns.reduce(
    (sum, run) => sum + run.elevation_gain,
    0
  );
  const hrRuns = selectedRuns.filter((run) => run.avg_hr !== null);
  const avgHr = hrRuns.length
    ? Math.round(
        hrRuns.reduce((sum, run) => sum + (run.avg_hr ?? 0), 0) / hrRuns.length
      )
    : null;
  const pace = distance > 0 ? Math.round(totalTime / distance) : null;

  return { avgHr, distance, elevation, pace, selectedRuns, totalTime };
}

function RangeSelector({
  range,
  setRange,
}: {
  range: SummaryRange;
  setRange: (range: SummaryRange) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:mb-8">
      {summaryRanges.map((item) => (
        <button
          className={`min-h-6 rounded-[2px] border px-2 py-1 font-mono text-[0.4rem] uppercase tracking-[0.02em] transition sm:min-h-8 sm:px-2.5 sm:text-[0.4rem] sm:tracking-[0.08em] ${
            range === item.key
              ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
          }`}
          key={item.key}
          onClick={() => setRange(item.key)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function WeeklyJournalBars({ buckets }: { buckets: WeeklyBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.totalKm), 1);
  const mid = Math.round(max / 2);
  const points = buckets.map((bucket, index) => {
    const x =
      buckets.length === 1 ? 50 : ((index + 0.5) / buckets.length) * 100;
    const y = 100 - (bucket.totalKm / max) * 100;
    return { ...bucket, x, y };
  });
  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="py-6">
      <div className="grid min-w-0 grid-cols-[3rem_1fr] gap-3 sm:grid-cols-[4rem_1fr] sm:gap-4">
        <div className="grid h-56 grid-rows-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)] sm:h-72 sm:text-[0.68rem] sm:tracking-[0.14em]">
          <span>{Math.ceil(max)} km</span>
          <span className="self-center">{mid} km</span>
          <span className="self-end">0 km</span>
        </div>
        <div className="relative h-56 min-w-0 overflow-visible border-b border-l border-[var(--border)] pl-2 sm:h-72">
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {buckets.map((bucket) => (
              <Link
                aria-label={`Open week of ${bucket.label}: ${bucket.totalKm.toFixed(1)} km`}
                className="group relative flex h-full flex-1 items-end no-underline"
                href={`/runs?dateFrom=${bucket.start}&dateTo=${bucket.end}`}
                key={bucket.start}
              >
                <span className="pointer-events-none absolute top-2 left-1/2 z-10 hidden w-40 -translate-x-1/2 border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--bone)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:grid sm:gap-1">
                  <span>{bucket.label}</span>
                  <span>{bucket.totalKm.toFixed(1)} km</span>
                  <span>
                    {bucket.runs} runs
                    {bucket.elevationGain
                      ? ` · ${bucket.elevationGain} m D+`
                      : ""}
                  </span>
                </span>
                <span
                  className="block w-full bg-[var(--primary)] opacity-55 transition group-hover:opacity-90 group-focus-visible:opacity-90"
                  style={{
                    height:
                      bucket.totalKm > 0
                        ? `${Math.max(2, (bucket.totalKm / max) * 100)}%`
                        : "0%",
                  }}
                />
              </Link>
            ))}
          </div>
          <svg
            aria-label="Weekly volume trend line"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            <polyline
              fill="none"
              points={linePath}
              stroke="oklch(0.88 0.04 85 / 0.72)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      <p className="ui-label mt-3">
        Each bar is one week · click to inspect runs
      </p>
    </div>
  );
}

function DistanceDistribution({ runs }: { runs: Run[] }) {
  const maxDistance = Math.max(
    ...runs.map((run) => Math.ceil(run.distance)),
    1
  );
  const counts = new Map<number, number>();

  for (const run of runs) {
    const bucket = Math.max(1, Math.round(run.distance));
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const buckets = Array.from({ length: maxDistance }, (_, index) => {
    const distance = index + 1;
    return { distance, count: counts.get(distance) ?? 0 };
  });
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const midCount = Math.round(maxCount / 2);
  const midDistance = Math.round(maxDistance / 2);
  const curvePoints = buckets.map((bucket, index) => {
    const previous = buckets[index - 1]?.count ?? bucket.count;
    const next = buckets[index + 1]?.count ?? bucket.count;
    const smoothed = (previous + bucket.count * 2 + next) / 4;
    const x = buckets.length === 1 ? 50 : (index / (buckets.length - 1)) * 100;
    const y = 100 - (smoothed / maxCount) * 100;
    return `${x},${y}`;
  });

  return (
    <div className="py-6">
      <div className="grid min-w-0 grid-cols-[3rem_1fr] gap-3 sm:grid-cols-[4rem_1fr] sm:gap-4">
        <div className="grid h-56 grid-rows-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)] sm:h-72 sm:text-[0.68rem] sm:tracking-[0.14em]">
          <span>{maxCount} runs</span>
          <span className="self-center">{midCount} runs</span>
          <span className="self-end">0 runs</span>
        </div>
        <div className="relative h-56 min-w-0 overflow-visible border-b border-l border-[var(--border)] pl-2 sm:h-72">
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {buckets.map((bucket) => (
              <div
                aria-label={`${bucket.count} runs around ${bucket.distance} km`}
                className="group relative flex h-full flex-1 items-end"
                key={bucket.distance}
              >
                <span className="pointer-events-none absolute top-2 left-1/2 z-10 hidden max-w-[10rem] -translate-x-1/2 whitespace-nowrap border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--bone)] opacity-0 transition group-hover:opacity-100 sm:block">
                  {bucket.distance} km · {bucket.count}{" "}
                  {bucket.count === 1 ? "run" : "runs"}
                </span>
                <span
                  className="block w-full bg-[var(--primary)] opacity-55 transition group-hover:opacity-90"
                  style={{
                    height:
                      bucket.count > 0
                        ? `${Math.max(2, (bucket.count / maxCount) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <svg
            aria-label="Distance distribution overlay curve"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            <polyline
              fill="none"
              points={curvePoints.join(" ")}
              stroke="oklch(0.88 0.04 85 / 0.72)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 pl-[4rem] font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)] sm:pl-[5rem] sm:text-[0.68rem] sm:tracking-[0.14em]">
        <span>1 km</span>
        <span className="text-center">{midDistance} km</span>
        <span className="text-right">{maxDistance} km</span>
      </div>
      <p className="ui-label mt-3">Rounded run distance · hover to see count</p>
    </div>
  );
}

function HeartZoneDistribution({
  currentForm,
  maxHr,
  runs,
}: {
  currentForm: ReturnType<typeof buildDashboardData>["summary"]["currentForm"];
  maxHr: number | null | undefined;
  runs: Run[];
}) {
  const zoneKm = { z1: 0, z2: 0, z3: 0, z4: 0 };

  if (maxHr) {
    for (const run of runs) {
      if (!run.avg_hr) continue;
      const percent = run.avg_hr / maxHr;
      if (percent < 0.7) zoneKm.z1 += run.distance;
      else if (percent < 0.81) zoneKm.z2 += run.distance;
      else if (percent < 0.9) zoneKm.z3 += run.distance;
      else zoneKm.z4 += run.distance;
    }
  }

  const total = zoneKm.z1 + zoneKm.z2 + zoneKm.z3 + zoneKm.z4;
  const rows = [
    { label: "Z1", value: zoneKm.z1, color: "bg-[var(--trend-neutral)]" },
    { label: "Z2", value: zoneKm.z2, color: "bg-[var(--zone2)]" },
    { label: "Z3", value: zoneKm.z3, color: "bg-[var(--zone3)]" },
    { label: "Z4+", value: zoneKm.z4, color: "bg-[var(--zone4)]" },
  ];

  return (
    <Card className="order-3 lg:order-none lg:col-span-2">
      <div className="grid min-w-0 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h2 className="ui-label">Heart Rate Zone Distribution</h2>
          <div className="mt-6 grid gap-4">
            {total > 0 ? (
              rows.map((row) => {
                const pct = Math.round((row.value / total) * 100);
                return (
                  <div
                    className="grid min-w-0 grid-cols-[3rem_1fr_3rem] items-center gap-3 sm:gap-4"
                    key={row.label}
                  >
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--bone)]">
                      {row.label}
                    </span>
                    <span className="h-1 bg-[var(--muted)]">
                      <span
                        className={`block h-full ${row.color}`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </span>
                    <span className="text-right font-mono text-[0.68rem] text-[var(--secondary)]">
                      {pct}%
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Add max HR in Settings and import runs with average HR to see
                zone distribution.
              </p>
            )}
          </div>
        </div>

        <div className="pt-2 lg:pl-8">
          <h2 className="ui-label">Form Status</h2>
          {currentForm ? (
            <>
              <span className="mt-5 inline-flex rounded-[2px] border border-[#4ade8044] bg-[#15803d22] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--trend-up)]">
                {currentForm.label}
              </span>
              <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                TSB {currentForm.value > 0 ? "+" : ""}
                {currentForm.value} · {currentForm.label}
              </p>
            </>
          ) : (
            <p className="mt-5 text-sm text-[var(--muted-foreground)]">
              Fitness form appears after enough run history has computed CTL,
              ATL, and TSB.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ThisWeekPaceTrend({ runs, streak }: { runs: Run[]; streak: number }) {
  const weekStart = startOfCurrentWeek();
  const weekRuns = [...runs]
    .filter((run) => run.date >= weekStart)
    .sort((a, b) => a.date.localeCompare(b.date));
  const bestPace = weekRuns.length
    ? Math.min(...weekRuns.map((run) => run.avg_pace))
    : null;
  const chartRuns = weekRuns.slice(-7);
  const values = chartRuns.map((run) => run.avg_pace);
  const min = values.length ? Math.min(...values) - 20 : 240;
  const max = values.length ? Math.max(...values) + 20 : 420;
  const range = Math.max(1, max - min);
  const points = chartRuns.map((run, index) => {
    const x =
      chartRuns.length === 1 ? 50 : (index / (chartRuns.length - 1)) * 100;
    const y = 100 - ((run.avg_pace - min) / range) * 100;
    return { ...run, x, y };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const ticks = [min, min + range / 3, min + (range * 2) / 3, max];

  return (
    <Card className="order-4 lg:order-none">
      <h2 className="ui-label">This Week Pace Trend</h2>
      {points.length >= 2 ? (
        <div className="mt-6 grid min-w-0 grid-cols-[3rem_1fr] gap-3">
          <div className="grid h-40 grid-rows-4 font-mono text-[0.68rem] text-[var(--secondary)]">
            {ticks.toReversed().map((tick) => (
              <span key={tick}>{formatDashboardPace(Math.round(tick))}</span>
            ))}
          </div>
          <div>
            <svg
              aria-label="This week pace trend"
              className="h-40 w-full overflow-hidden border-b border-l border-[var(--border)]"
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 100 100"
            >
              {[25, 50, 75].map((y) => (
                <line
                  key={y}
                  stroke="oklch(0.36 0.012 80)"
                  strokeWidth="0.35"
                  vectorEffect="non-scaling-stroke"
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                />
              ))}
              <polyline
                fill="none"
                points={path}
                stroke="oklch(0.78 0.075 78)"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
              {points.map((point) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="var(--card)"
                  key={point.id}
                  r="2"
                  stroke="oklch(0.78 0.075 78)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{`${weekdayLabel(point.date)} · ${formatDashboardPace(point.avg_pace)}`}</title>
                </circle>
              ))}
            </svg>
            <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-[var(--muted-foreground)]">
              {points.map((point) => (
                <span key={point.id}>{weekdayLabel(point.date)}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--muted-foreground)]">
          Add at least two runs this week to draw the pace trend.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-6 pt-5">
        <JournalMetric
          label="Best pace"
          unit="/km"
          value={
            bestPace ? formatDashboardPace(bestPace).replace("/km", "") : "-"
          }
        />
        <JournalMetric label="Cadence" unit="spm" value="-" />
        <JournalMetric label="Runs" value={weekRuns.length} />
        <JournalMetric label="Streak" unit="days" value={streak} />
      </div>
    </Card>
  );
}

function YearProgress({
  runs,
  weeklyGoal,
}: {
  runs: Run[];
  weeklyGoal: number;
}) {
  const currentYear = new Date().getUTCFullYear();
  const yearRuns = runs.filter((run) => run.date.startsWith(`${currentYear}-`));
  const totalKm = yearRuns.reduce((sum, run) => sum + run.distance, 0);
  const totalSeconds = yearRuns.reduce((sum, run) => sum + run.moving_time, 0);
  const targetKm = Math.max(1, Math.round(weeklyGoal * 52));
  const progress = Math.min(100, (totalKm / targetKm) * 100);

  return (
    <div className="pt-5">
      <div className="flex flex-col gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--secondary)] md:flex-row md:items-center md:justify-between">
        <span>
          Year total — {totalKm.toFixed(1)} km ·{" "}
          {formatDurationShort(totalSeconds)} · {yearRuns.length} runs
        </span>
        <span>
          Target {targetKm.toLocaleString("en")} km — {progress.toFixed(1)}%
        </span>
      </div>
      <div className="mt-3 h-1 bg-[var(--muted)]">
        <div
          className="h-full bg-[var(--primary)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardRunsClient({
  currentPrRecords,
  initialRuns,
  profile,
}: {
  currentPrRecords: PersonalRecordBadgeRecord[];
  initialRuns: Run[];
  profile: Pick<
    Profile,
    | "id"
    | "name"
    | "weekly_km_goal"
    | "max_hr"
    | "ftp_pace"
    | "strava_connected"
  > | null;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("week");

  useEffect(() => {
    if (!profile?.id) return;
    if (initialRuns.length > 0) {
      void upsertCachedRuns(initialRuns);
    }
    void getCachedRuns(profile.id).then((cachedRuns) => {
      if (cachedRuns.length > 0) setRuns(cachedRuns);
    });
  }, [initialRuns, profile?.id]);

  const dashboard = useMemo(
    () => buildDashboardData(runs, profile),
    [profile, runs]
  );
  const currentPrBadgeMap = useMemo(
    () => buildPrBadgeMap(currentPrRecords),
    [currentPrRecords]
  );
  const showHrChart = dashboard.hrHistory.length >= 5;
  const rangeStats = selectedRangeSummary(runs, summaryRange);
  const latestFitness = dashboard.fitnessPreview.at(-1);
  const weekLongestRun = [...runs]
    .filter((run) => run.date >= startOfCurrentWeek())
    .sort((a, b) => b.distance - a.distance)[0];

  if (runs.length === 0) {
    return (
      <Card className="vbars overflow-hidden bg-[color-mix(in_oklch,var(--background)_78%,black)]">
        <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="ui-label">Empty logbook</p>
            <h2 className="instrument-heading mt-3 text-4xl">
              Welcome{profile?.name ? `, ${profile.name}` : ""}.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
              Start by importing a GPX file, connecting Strava, or adding a
              manual run. Trends unlock after a few activities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Link className={actionClass} href="/runs">
              Import GPX
            </Link>
            <Link className={secondaryActionClass} href="/settings">
              Connect Strava
            </Link>
            <Link className={ghostActionClass} href="/runs">
              Add manually
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-10 md:gap-16">
      <section className="grid min-w-0 gap-8 md:min-h-[32rem] md:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="min-w-0 md:min-h-[30rem]">
          <p className="ui-label">[01 / Field Journal]</p>
          <h2 className="instrument-heading mt-5 max-w-3xl text-5xl leading-[0.94] sm:text-6xl md:mt-8 md:text-8xl xl:text-9xl">
            Where every stride is measured
          </h2>
          {weekLongestRun ? (
            <p className="ui-label mt-6 md:mt-12">
              Week long run · {weekLongestRun.distance.toFixed(1)} km ·{" "}
              {weekLongestRun.elevation_gain.toFixed(0)} m ↑
            </p>
          ) : null}
        </div>

        <div className="min-w-0 md:pt-8">
          <RangeSelector range={summaryRange} setRange={setSummaryRange} />
          <div className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-12">
            <JournalMetric
              label="Distance"
              unit="km"
              value={formatMetric(rangeStats.distance)}
            />
            <JournalMetric
              label="Total time"
              value={formatDurationShort(rangeStats.totalTime)}
            />
            <JournalMetric
              label="Avg pace"
              unit="/km"
              value={
                rangeStats.pace
                  ? formatDashboardPace(rangeStats.pace).replace("/km", "")
                  : "-"
              }
            />
            <JournalMetric
              label="Elevation gain"
              unit="m"
              value={Math.round(rangeStats.elevation).toLocaleString("en")}
            />
            <JournalMetric
              label="Avg heart rate"
              unit="bpm"
              value={rangeStats.avgHr ?? "-"}
            />
            <JournalMetric
              label="Fitness · CTL"
              value={latestFitness?.ctl ?? "-"}
            />
          </div>
          <p className="mt-8 max-w-xl font-serif text-lg leading-7 text-[var(--foreground)] md:mt-10 md:text-xl md:leading-8">
            Import any run — road, trail, track. Treinante draws the full
            picture: splits, climbs, fitness, fatigue, predictions, reports, and
            records.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link className={actionClass} href="/runs">
              Import run
            </Link>
            <Link className={ghostActionClass} href="/runs">
              View runs →
            </Link>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="ui-label">[02 / Training Load]</p>
            <h2 className="instrument-heading mt-2 text-4xl">Last 12 weeks</h2>
          </div>
          <p className="ui-label text-right">
            Goal · {dashboard.summary.weeklyGoal.toFixed(0)} km / wk
          </p>
        </div>
        <WeeklyJournalBars buckets={dashboard.weeklyBuckets} />
      </section>

      <section className="min-w-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="ui-label">[03 / Distance Library]</p>
            <h2 className="instrument-heading mt-2 text-4xl">
              Distances Counted
            </h2>
          </div>
          <p className="ui-label text-right">{runs.length} runs indexed</p>
        </div>
        <DistanceDistribution runs={runs} />
      </section>

      <section className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2">
        <div className="order-0 lg:col-span-2">
          <p className="ui-label">[04 / Signals]</p>
          <h2 className="instrument-heading mt-2 text-4xl">Trends</h2>
        </div>
        <Card
          className="order-5 lg:order-none"
          subtitle="Last 60 days, with GAP when elevation splits exist."
        >
          <h2 className="instrument-heading text-2xl">Pace trend</h2>
          {dashboard.paceHistory.length >= 4 ? (
            <div className="mt-4 h-[210px] min-w-0 overflow-hidden sm:h-[320px]">
              <PaceTrendChart points={dashboard.paceHistory} />
            </div>
          ) : (
            <p className="mt-16 text-center text-sm text-[var(--muted-foreground)]">
              Add more runs to see trends. Charts appear after a few runs.
            </p>
          )}
        </Card>

        {showHrChart ? (
          <Card
            className="order-1 lg:order-none"
            subtitle="7-run rolling average, last 60 days."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="instrument-heading text-2xl">Heart rate trend</h2>
              <div className="flex flex-wrap gap-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--secondary)] sm:gap-4 sm:text-[0.68rem] sm:tracking-[0.14em]">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-px w-6 border-t-2 border-dashed border-[#38f27d] sm:w-8"
                  />
                  Z2 ceiling
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-px w-6 border-t-2 border-dashed border-[#ffb21a] sm:w-8"
                  />
                  Z4 floor
                </span>
              </div>
            </div>
            <div className="mt-4 h-[210px] min-w-0 overflow-hidden sm:h-[300px]">
              <HrTrendChart
                points={dashboard.hrHistory}
                maxHr={profile?.max_hr ?? null}
              />
            </div>
          </Card>
        ) : dashboard.hasHrData ? null : (
          <Card
            className="order-1 lg:order-none"
            subtitle="Connect a heart rate monitor or import from Strava to see HR trends."
          />
        )}

        <Card
          className="order-2 lg:order-none"
          subtitle="Compact preview of CTL and ATL."
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="instrument-heading text-2xl">Fitness preview</h2>
            <Link
              className="text-sm text-[var(--primary)] no-underline"
              href="/fitness"
            >
              View full fitness chart
            </Link>
          </div>
          {dashboard.fitnessPreview.length > 0 ? (
            <div className="mt-4 h-[210px] min-w-0 overflow-hidden sm:h-[300px]">
              <FitnessPreviewChart points={dashboard.fitnessPreview} />
            </div>
          ) : (
            <p className="mt-16 text-center text-sm text-[var(--muted-foreground)]">
              Keep running. Fitness tracking fills in after 2 weeks.
            </p>
          )}
        </Card>

        <HeartZoneDistribution
          currentForm={dashboard.summary.currentForm}
          maxHr={profile?.max_hr}
          runs={runs}
        />
        <ThisWeekPaceTrend
          runs={runs}
          streak={dashboard.summary.longestStreak}
        />
      </section>

      <section className="min-w-0">
        <div className="grid min-w-0 gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="min-w-0">
            <p className="ui-label">[05 / Latest Efforts]</p>
            <h2 className="instrument-heading mt-4 text-5xl leading-none md:text-7xl">
              Every
              <br />
              <em>distance</em>
              <br />
              accounted for.
            </h2>
            <p className="mt-8 max-w-sm text-sm leading-6 text-[var(--foreground)]">
              Treinante scans your logbook and turns ordinary kilometres into a
              field record: every shake-out, long run, climb, and test effort
              preserved as part of the runner you are becoming.
            </p>
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex justify-end">
              <Link className="ui-label no-underline" href="/runs">
                All runs →
              </Link>
            </div>
            <div>
              {dashboard.recentRuns.map((run) => {
                const prBadgeLabel = formatPrBadgeLabel(
                  currentPrBadgeMap.get(run.id)
                );

                return (
                  <Link
                    className="grid min-w-0 grid-cols-2 gap-3 border-b border-[var(--border)] py-5 text-sm no-underline last:border-b-0 md:grid-cols-[0.65fr_0.75fr_0.75fr_0.75fr] md:items-center"
                    href={`/runs/${run.id}`}
                    key={run.id}
                  >
                    <span className="flex min-w-0 items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--secondary)] sm:gap-3 sm:tracking-[0.14em]">
                      {run.date.slice(5)}
                      {prBadgeLabel ? (
                        <span
                          aria-label="Current personal record"
                          className="inline-flex items-center gap-1 rounded-[2px] border border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--primary)]"
                        >
                          <span aria-hidden="true">★</span>
                          {prBadgeLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 truncate font-mono text-[var(--bone)]">
                      {run.distance.toFixed(1)} km
                    </span>
                    <span className="min-w-0 truncate font-mono text-[var(--bone)]">
                      {formatDashboardPace(run.avg_pace)}
                    </span>
                    <span className="min-w-0 truncate font-mono text-[var(--bone)]">
                      {formatDurationShort(run.moving_time)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        <YearProgress runs={runs} weeklyGoal={dashboard.summary.weeklyGoal} />
      </section>

      <section className="grid min-w-0 items-end gap-6 pt-10 lg:grid-cols-[1fr_auto]">
        <h2 className="instrument-heading text-4xl leading-none md:text-6xl">
          A complete picture of the runner you are —{" "}
          <em>and the one becoming.</em>
        </h2>
        <Link className={secondaryActionClass} href="/runs">
          Begin import
        </Link>
      </section>
    </div>
  );
}
