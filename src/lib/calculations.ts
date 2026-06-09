import type { SupabaseClient } from "@supabase/supabase-js";

import type { FitnessPoint, Profile, Run } from "@/types";
import type { Database, TablesUpdate } from "@/types/supabase";

type RunFitnessUpdate = Pick<
  TablesUpdate<"runs">,
  "training_load" | "ctl_at_date" | "atl_at_date" | "tsb_at_date"
>;

const ATL_FACTOR = 1 - Math.exp(-1 / 7);
const CTL_FACTOR = 1 - Math.exp(-1 / 42);

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function countTrainingDays(runs: Pick<Run, "date">[]) {
  return new Set(runs.map((run) => run.date)).size;
}

export function computeTrainingLoad(
  run: Pick<Run, "moving_time" | "avg_hr" | "avg_pace">,
  profile: Pick<Profile, "max_hr" | "ftp_pace"> | null
): number {
  const durationHours = run.moving_time / 3600;
  const hrRatio =
    run.avg_hr && profile?.max_hr
      ? run.avg_hr / profile.max_hr
      : profile?.ftp_pace && run.avg_pace > 0
        ? profile.ftp_pace / run.avg_pace
        : 0.75;
  const boundedRatio = Math.max(0.5, Math.min(hrRatio, 1.2));
  const intensityFactor =
    boundedRatio < 0.81 ? 0.65 : boundedRatio < 0.9 ? 0.85 : 1.05;

  return Math.round(durationHours * boundedRatio * intensityFactor * 100);
}

export function computeFitnessTimeSeries(
  runs: Run[],
  profile: Pick<Profile, "max_hr" | "ftp_pace"> | null,
  today = new Date()
): FitnessPoint[] {
  const sorted = [...runs].sort((a, b) => a.date.localeCompare(b.date));
  const firstRun = sorted[0];
  if (!firstRun) return [];

  const dailyLoad = new Map<string, number>();
  for (const run of sorted) {
    dailyLoad.set(
      run.date,
      (dailyLoad.get(run.date) ?? 0) + computeTrainingLoad(run, profile)
    );
  }

  const end = toUtcDate(toIsoDate(today));
  let ctl = 0;
  let atl = 0;
  const series: FitnessPoint[] = [];

  for (
    let date = toUtcDate(firstRun.date);
    date <= end;
    date = addDays(date, 1)
  ) {
    const key = toIsoDate(date);
    const load = dailyLoad.get(key) ?? 0;
    ctl += (load - ctl) * CTL_FACTOR;
    atl += (load - atl) * ATL_FACTOR;

    series.push({
      date: key,
      ctl: roundOne(ctl),
      atl: roundOne(atl),
      tsb: roundOne(ctl - atl),
    });
  }

  return series;
}

export function getCurrentFormLabel(tsb: number) {
  if (tsb > 15) return "Fresh";
  if (tsb >= 5) return "Optimal";
  if (tsb >= -10) return "Neutral";
  if (tsb >= -20) return "Fatigued";
  return "Overreaching";
}

export function getFormVariant(tsb: number) {
  if (tsb > 15) return "fresh";
  if (tsb >= 5) return "optimal";
  if (tsb >= -10) return "neutral";
  if (tsb >= -20) return "fatigued";
  return "overreach";
}

export function hasOverreachingStreak(series: FitnessPoint[], days = 3) {
  return (
    series.slice(-days).length === days &&
    series.slice(-days).every((point) => point.tsb < -20)
  );
}

export function generateFitnessInsights(series: FitnessPoint[]) {
  const today = series.at(-1);
  if (!today) return [];

  const insights: string[] = [];
  const thirtyDaysAgo = series.at(-31);

  if (thirtyDaysAgo && thirtyDaysAgo.ctl > 0) {
    const ctlChange =
      ((today.ctl - thirtyDaysAgo.ctl) / thirtyDaysAgo.ctl) * 100;
    if (ctlChange > 10) {
      insights.push(
        `Fitness up ${ctlChange.toFixed(0)}% over 30 days - solid build.`
      );
    } else if (ctlChange < -10) {
      insights.push(
        `Fitness down ${Math.abs(ctlChange).toFixed(0)}% - training volume has dipped.`
      );
    }
  }

  if (today.tsb > 10) {
    insights.push(
      `Form is good (TSB +${today.tsb}) - good time for quality work.`
    );
  }
  if (today.tsb < -20) {
    insights.push(
      `Overreaching territory (TSB ${today.tsb}) - consider easy days.`
    );
  }

  const peak = series.reduce(
    (best, point) => (point.ctl > best.ctl ? point : best),
    today
  );
  insights.push(
    `Peak fitness this period: ${peak.ctl.toFixed(1)} on ${peak.date.slice(5)}.`
  );

  return insights.slice(0, 3);
}

export async function recalculateFitnessSnapshots(
  supabase: SupabaseClient<Database>,
  userId: string,
  today = new Date()
) {
  const [
    { data: runs, error: runsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase.from("runs").select("*").eq("user_id", userId),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);

  if (runsError) throw runsError;
  if (profileError) throw profileError;

  const typedRuns = (runs ?? []) as unknown as Run[];
  const typedProfile = profile as Profile;
  const series = computeFitnessTimeSeries(typedRuns, typedProfile, today);
  const pointsByDate = new Map(series.map((point) => [point.date, point]));

  await Promise.all(
    typedRuns.map((run) => {
      const point = pointsByDate.get(run.date);
      const update: RunFitnessUpdate = {
        training_load: computeTrainingLoad(run, typedProfile),
        ctl_at_date: point?.ctl ?? null,
        atl_at_date: point?.atl ?? null,
        tsb_at_date: point?.tsb ?? null,
      };

      return supabase
        .from("runs")
        .update(update)
        .eq("id", run.id)
        .throwOnError();
    })
  );

  return series;
}
