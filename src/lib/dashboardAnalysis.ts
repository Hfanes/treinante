import { analyzeRun, formatPace } from "@/lib/runAnalysis";
import { getCurrentFormLabel } from "@/lib/calculations";
import type { EffortZone, Profile, Run } from "@/types";

export interface WeeklyBucket {
  start: string;
  end: string;
  label: string;
  totalKm: number;
  runs: number;
  elevationGain: number;
  zoneKm: Record<EffortZone, number>;
}

export interface PacePoint {
  date: string;
  pace: number;
  gap: number | null;
  rollingPace: number | null;
  distance: number;
}

export interface HrPoint {
  date: string;
  hr: number;
  rollingHr: number | null;
}

export interface FitnessPoint {
  date: string;
  ctl: number;
  atl: number;
}

export interface DashboardSummary {
  currentWeekKm: number;
  weeklyGoal: number;
  weeklyGoalPct: number;
  expectedWeekPct: number;
  goalStatus: "green" | "amber" | "red";
  last30DaysKm: number;
  totalRuns: number;
  longestStreak: number;
  currentForm: { value: number; label: string } | null;
}

export interface DashboardData {
  summary: DashboardSummary;
  weeklyBuckets: WeeklyBucket[];
  paceHistory: PacePoint[];
  hrHistory: HrPoint[];
  fitnessPreview: FitnessPoint[];
  recentRuns: Array<Run & { zone: EffortZone | null }>;
  hasHrData: boolean;
  hasElevationData: boolean;
  elevationRunCount: number;
  daysWithRuns: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() - day + 1);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatWeekLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function rollingAverage(values: number[], index: number, windowSize: number) {
  const window = values.slice(Math.max(0, index - windowSize + 1), index + 1);
  if (window.length < windowSize) return null;
  return Math.round(sum(window) / window.length);
}

export function computeLongestStreak(runs: Run[]) {
  const days = [...new Set(runs.map((run) => run.date))].sort();
  let longest = 0;
  let current = 0;
  let previous: string | null = null;

  for (const day of days) {
    current =
      previous && toDate(day).getTime() - toDate(previous).getTime() === DAY_MS
        ? current + 1
        : 1;
    longest = Math.max(longest, current);
    previous = day;
  }

  return longest;
}

export function buildWeeklyBuckets(
  runs: Run[],
  profile: Pick<Profile, "max_hr" | "lthr" | "hr_zone_method" | "ftp_pace"> | null,
  today = new Date()
) {
  const currentWeek = startOfWeek(today);
  const starts = Array.from({ length: 12 }, (_, index) =>
    addDays(currentWeek, (index - 11) * 7)
  );

  return starts.map((start) => {
    const end = addDays(start, 6);
    const startIso = toIsoDate(start);
    const endIso = toIsoDate(end);
    const weekRuns = runs.filter(
      (run) => run.date >= startIso && run.date <= endIso
    );
    const zoneKm: Record<EffortZone, number> = { z2: 0, z3: 0, z4: 0 };

    for (const run of weekRuns) {
      const zone = analyzeRun(run, profile).zone;
      if (zone) zoneKm[zone] += run.distance;
    }

    return {
      start: startIso,
      end: endIso,
      label: formatWeekLabel(start),
      totalKm: Number(sum(weekRuns.map((run) => run.distance)).toFixed(1)),
      runs: weekRuns.length,
      elevationGain: Math.round(sum(weekRuns.map((run) => run.elevation_gain))),
      zoneKm,
    } satisfies WeeklyBucket;
  });
}

export function buildDashboardData(
  runs: Run[],
  profile: Pick<
    Profile,
    "weekly_km_goal" | "max_hr" | "lthr" | "hr_zone_method" | "ftp_pace"
  > | null,
  today = new Date()
): DashboardData {
  const sortedDesc = [...runs].sort((a, b) => b.date.localeCompare(a.date));
  const sortedAsc = [...runs].sort((a, b) => a.date.localeCompare(b.date));
  const todayIso = toIsoDate(today);
  const currentWeekStart = toIsoDate(startOfWeek(today));
  const last30Start = toIsoDate(addDays(today, -29));
  const last60Start = toIsoDate(addDays(today, -59));
  const weekRuns = runs.filter(
    (run) => run.date >= currentWeekStart && run.date <= todayIso
  );
  const last30Runs = runs.filter(
    (run) => run.date >= last30Start && run.date <= todayIso
  );
  const goal = profile?.weekly_km_goal ?? 0;
  const currentWeekKm = Number(
    sum(weekRuns.map((run) => run.distance)).toFixed(1)
  );
  const expectedWeekPct = ((today.getUTCDay() || 7) / 7) * 100;
  const weeklyGoalPct =
    goal > 0 ? Math.min(100, (currentWeekKm / goal) * 100) : 0;
  const behindBy = expectedWeekPct - weeklyGoalPct;
  const latestTsbRun = sortedDesc.find((run) => run.tsb_at_date !== null);
  const uniqueDays = new Set(runs.map((run) => run.date));
  const paceRuns = sortedAsc.filter((run) => run.date >= last60Start);
  const paces = paceRuns.map((run) => run.avg_pace);
  const hrRuns = sortedAsc.filter(
    (run) => run.date >= last60Start && run.avg_hr !== null
  );
  const hrs = hrRuns.map((run) => run.avg_hr ?? 0);
  const fitnessPreview = sortedAsc
    .filter((run) => run.ctl_at_date !== null && run.atl_at_date !== null)
    .slice(-42)
    .map((run) => ({
      date: run.date,
      ctl: Math.round(run.ctl_at_date ?? 0),
      atl: Math.round(run.atl_at_date ?? 0),
    }));

  return {
    summary: {
      currentWeekKm,
      weeklyGoal: goal,
      weeklyGoalPct,
      expectedWeekPct,
      goalStatus: behindBy > 40 ? "red" : behindBy > 20 ? "amber" : "green",
      last30DaysKm: Number(
        sum(last30Runs.map((run) => run.distance)).toFixed(1)
      ),
      totalRuns: runs.length,
      longestStreak: computeLongestStreak(runs),
      currentForm:
        uniqueDays.size >= 7 &&
        latestTsbRun?.tsb_at_date !== null &&
        latestTsbRun?.tsb_at_date !== undefined
          ? {
              value: Math.round(latestTsbRun.tsb_at_date),
              label: getCurrentFormLabel(latestTsbRun.tsb_at_date),
            }
          : null,
    },
    weeklyBuckets: buildWeeklyBuckets(runs, profile, today),
    paceHistory: paceRuns.map((run, index) => ({
      date: run.date,
      pace: run.avg_pace,
      gap: analyzeRun(run, profile).wholeRunGap,
      rollingPace: rollingAverage(paces, index, 7),
      distance: run.distance,
    })),
    hrHistory: hrRuns.map((run, index) => ({
      date: run.date,
      hr: run.avg_hr ?? 0,
      rollingHr: rollingAverage(hrs, index, 7),
    })),
    fitnessPreview,
    recentRuns: sortedDesc
      .slice(0, 5)
      .map((run) => ({ ...run, zone: analyzeRun(run, profile).zone })),
    hasHrData: runs.some((run) => run.avg_hr !== null),
    hasElevationData: runs.some((run) => run.elevation_gain > 0),
    elevationRunCount: runs.filter((run) => run.elevation_gain > 0).length,
    daysWithRuns: uniqueDays.size,
  };
}

export function formatDashboardPace(seconds: number) {
  return formatPace(seconds).replace(" /km", "/km");
}
