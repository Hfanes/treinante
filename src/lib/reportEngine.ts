import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyZone } from "@/lib/runAnalysis";
import type { EffortZone, Profile, Run, WeeklyReport } from "@/types";
import type { Database, TablesInsert } from "@/types/supabase";

type WeeklyReportInsert = TablesInsert<"weekly_reports">;

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function numberValue(value: unknown, fallback = 0) {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function nullableNumberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const next = numberValue(value, Number.NaN);
  return Number.isFinite(next) ? next : null;
}

function mean(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

export function getWeekStart(date: Date) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = next.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setUTCDate(next.getUTCDate() + offset);
  return toIsoDate(next);
}

export function getPreviousWeekStart(today = new Date()) {
  return toIsoDate(
    new Date(toUtcDate(getWeekStart(today)).getTime() - 7 * DAY_MS)
  );
}

function runsForWeek(runs: Run[], weekStart: string) {
  const start = toUtcDate(weekStart).getTime();
  const end = start + 7 * DAY_MS;
  return runs.filter((run) => {
    const date = toUtcDate(run.date).getTime();
    return date >= start && date < end;
  });
}

function hasElevationData(run: Run) {
  return (
    numberValue(run.elevation_gain) > 0 ||
    numberValue(run.elevation_loss) > 0 ||
    run.raw_splits.some((split) => numberValue(split.elevation) !== 0)
  );
}

function latestRun(runs: Run[]) {
  return [...runs]
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time ?? "").localeCompare(b.start_time ?? "");
    })
    .at(-1);
}

function formatKm(value: number) {
  return `${roundOne(value)} km`;
}

function buildZoneBreakdown(runs: Run[], profile: Profile) {
  const maxHr = nullableNumberValue(profile.max_hr);
  if (!maxHr) return null;

  const totals: Record<EffortZone, number> = { z2: 0, z3: 0, z4: 0 };

  for (const run of runs) {
    const zone = classifyZone(nullableNumberValue(run.avg_hr), maxHr);
    if (zone) totals[zone] += numberValue(run.moving_time);
  }

  const total = totals.z2 + totals.z3 + totals.z4;
  if (total === 0) return null;

  return {
    z2: Math.round((totals.z2 / total) * 100),
    z3: Math.round((totals.z3 / total) * 100),
    z4: Math.round((totals.z4 / total) * 100),
  } satisfies Record<EffortZone, number>;
}

function buildInsight(
  report: Omit<WeeklyReport, "id" | "generated_at">,
  profile: Profile
) {
  const sentences = [
    `Last week you ran ${formatKm(report.total_km)} across ${report.num_runs} ${report.num_runs === 1 ? "run" : "runs"}.`,
  ];

  const weeklyGoal = numberValue(profile.weekly_km_goal);

  if (weeklyGoal > 0) {
    const goalPct = Math.round((report.total_km / weeklyGoal) * 100);
    sentences.push(
      goalPct >= 100
        ? `You hit ${goalPct}% of your ${formatKm(weeklyGoal)} weekly goal.`
        : `You reached ${goalPct}% of your ${formatKm(weeklyGoal)} weekly goal.`
    );
  }

  if (report.tsb_end !== null) {
    if (report.tsb_end > 10) {
      sentences.push(
        `You finished fresh with TSB +${Math.round(report.tsb_end)}.`
      );
    } else if (report.tsb_end < -20) {
      sentences.push(
        `You finished fatigued with TSB ${Math.round(report.tsb_end)}; keep recovery visible.`
      );
    } else {
      sentences.push(
        `You finished in a balanced form range with TSB ${Math.round(report.tsb_end)}.`
      );
    }
  }

  if (report.zone_breakdown) {
    sentences.push(
      `Intensity split was ${report.zone_breakdown.z2}% Z2, ${report.zone_breakdown.z3}% Z3, and ${report.zone_breakdown.z4}% Z4.`
    );
  }

  return sentences.slice(0, 3).join(" ");
}

export function buildWeeklyReport(
  userId: string,
  weekStart: string,
  runs: Run[],
  profile: Profile
): Omit<WeeklyReport, "id" | "generated_at"> | null {
  const currentRuns = runsForWeek(runs, weekStart);
  if (currentRuns.length === 0) return null;

  const previousWeekStart = toIsoDate(
    new Date(toUtcDate(weekStart).getTime() - 7 * DAY_MS)
  );
  const previousRuns = runsForWeek(runs, previousWeekStart);
  const totalKm = roundOne(
    currentRuns.reduce((sum, run) => sum + numberValue(run.distance), 0)
  );
  const hasElevation = currentRuns.some(hasElevationData);
  const totalDPlus = hasElevation
    ? Math.round(
        currentRuns.reduce(
          (sum, run) => sum + numberValue(run.elevation_gain),
          0
        )
      )
    : null;
  const hrValues = currentRuns
    .map((run) => nullableNumberValue(run.avg_hr))
    .filter((value): value is number => value !== null);
  const lastRun = latestRun(currentRuns);
  const previousTotalKm = previousRuns.reduce(
    (sum, run) => sum + numberValue(run.distance),
    0
  );
  const previousTime = previousRuns.reduce(
    (sum, run) => sum + numberValue(run.moving_time),
    0
  );
  const previousHasElevation = previousRuns.some(hasElevationData);
  const previousDPlus = previousHasElevation
    ? previousRuns.reduce(
        (sum, run) => sum + numberValue(run.elevation_gain),
        0
      )
    : null;
  const totalMovingTime = currentRuns.reduce(
    (sum, run) => sum + numberValue(run.moving_time),
    0
  );
  const avgHr = mean(hrValues);
  const report = {
    user_id: userId,
    week_start: weekStart,
    total_km: totalKm,
    total_d_plus: totalDPlus,
    total_time: totalMovingTime,
    num_runs: currentRuns.length,
    avg_pace: Math.round(totalMovingTime / Math.max(totalKm, 0.001)),
    avg_hr: avgHr === null ? null : Math.round(avgHr),
    ctl_end: nullableNumberValue(lastRun?.ctl_at_date),
    atl_end: nullableNumberValue(lastRun?.atl_at_date),
    tsb_end: nullableNumberValue(lastRun?.tsb_at_date),
    vs_prev_km_delta: previousRuns.length
      ? roundOne(totalKm - previousTotalKm)
      : null,
    vs_prev_d_plus_delta:
      totalDPlus !== null && previousDPlus !== null
        ? Math.round(totalDPlus - previousDPlus)
        : null,
    vs_prev_time_delta: previousRuns.length
      ? totalMovingTime - previousTime
      : null,
    zone_breakdown: buildZoneBreakdown(currentRuns, profile),
    insight_text: null,
  } satisfies Omit<WeeklyReport, "id" | "generated_at">;

  return {
    ...report,
    insight_text: buildInsight(report, profile),
  };
}

export async function regenerateWeeklyReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekDate: string
): Promise<WeeklyReport | null> {
  const [
    { data: runs, error: runsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase.from("runs").select("*").eq("user_id", userId),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);

  if (runsError) throw runsError;
  if (profileError) throw profileError;

  const weekStart = getWeekStart(toUtcDate(weekDate));
  const report = buildWeeklyReport(
    userId,
    weekStart,
    (runs ?? []) as unknown as Run[],
    profile as Profile
  );

  if (!report) return null;

  const row: WeeklyReportInsert = {
    ...report,
    generated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("weekly_reports")
    .upsert(row, { onConflict: "user_id,week_start" })
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as WeeklyReport;
}

export async function ensurePreviousWeeklyReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  today = new Date()
) {
  const weekStart = getPreviousWeekStart(today);
  const { data: existing, error } = await supabase
    .from("weekly_reports")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;
  if (existing) return null;

  return regenerateWeeklyReport(supabase, userId, weekStart);
}

export async function recalculateWeeklyReports(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [
    { data: runs, error: runsError },
    { data: reports, error: reportsError },
  ] = await Promise.all([
    supabase.from("runs").select("date").eq("user_id", userId),
    supabase.from("weekly_reports").select("week_start").eq("user_id", userId),
  ]);

  if (runsError) throw runsError;
  if (reportsError) throw reportsError;

  const weeks = new Set(
    (runs ?? []).map((run) => getWeekStart(toUtcDate(run.date)))
  );
  const staleWeeks = (reports ?? [])
    .map((report) => report.week_start)
    .filter((weekStart) => !weeks.has(weekStart));

  if (staleWeeks.length > 0) {
    await supabase
      .from("weekly_reports")
      .delete()
      .eq("user_id", userId)
      .in("week_start", staleWeeks)
      .throwOnError();
  }

  await Promise.all(
    [...weeks].map((weekStart) =>
      regenerateWeeklyReport(supabase, userId, weekStart)
    )
  );
}
