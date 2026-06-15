import type { SupabaseClient } from "@supabase/supabase-js";

import type { FitnessPoint, PersonalRecord, Profile, Run } from "@/types";
import type { Database, TablesUpdate } from "@/types/supabase";

type RunFitnessUpdate = Pick<
  TablesUpdate<"runs">,
  "training_load" | "ctl_at_date" | "atl_at_date" | "tsb_at_date"
>;

const ATL_FACTOR = 1 - Math.exp(-1 / 7);
const CTL_FACTOR = 1 - Math.exp(-1 / 42);
const RIEGEL_EXPONENT = 1.06;
const PREDICTOR_ROLLING_WINDOWS = [21, 10, 5, 3] as const;

export const RACE_TARGETS = [
  { key: "mile", label: "1 mile", distance: 1.609, prType: "1_mile" },
  { key: "5k", label: "5 km", distance: 5, prType: "5k" },
  { key: "10k", label: "10 km", distance: 10, prType: "10k" },
  {
    key: "half",
    label: "Half marathon",
    distance: 21.0975,
    prType: "half_marathon",
  },
  { key: "marathon", label: "Marathon", distance: 42.195, prType: "marathon" },
  { key: "50k", label: "50 km", distance: 50, prType: "50k" },
] as const;

export interface PredictorAnchor {
  source: "rolling" | "whole-run";
  runId: string;
  runTitle: string | null;
  runDate: string;
  runSource: Run["source"];
  distance: number;
  time: number;
  pace: number;
  containsStops: boolean;
}

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

export function predictRaceTime(
  knownTime: number,
  knownDistance: number,
  targetDistance: number
) {
  if (knownTime <= 0 || knownDistance <= 0 || targetDistance <= 0) return null;
  return Math.round(
    knownTime * Math.pow(targetDistance / knownDistance, RIEGEL_EXPONENT)
  );
}

export function vo2maxFromPace(bestTimeSec: number, distanceKm: number) {
  if (bestTimeSec <= 0 || distanceKm <= 0) return null;
  const distanceM = distanceKm * 1000;
  const durationMin = bestTimeSec / 60;
  const velocity = distanceM / durationMin;
  const percentVO2max =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMin) +
    0.2989558 * Math.exp(-0.1932605 * durationMin);
  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity ** 2;

  return roundOne(vo2 / percentVO2max);
}

export function vo2maxFromHr(maxHr: number | null, restingHr: number | null) {
  if (!maxHr || !restingHr) return null;
  return roundOne(15 * (maxHr / restingHr));
}

export function predictTimeFromVO2max(vo2max: number, distanceKm: number) {
  if (vo2max <= 0 || distanceKm <= 0) return null;

  let low = 120;
  let high = 24 * 60 * 60;

  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;
    const estimate = vo2maxFromPace(mid, distanceKm) ?? 0;
    if (estimate > vo2max) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.round(high);
}

export function buildVo2RacePredictions(
  vo2max: number,
  personalRecords: Pick<PersonalRecord, "type" | "value">[] = []
) {
  const prs = new Map(personalRecords.map((record) => [record.type, record]));

  return RACE_TARGETS.map((target) => {
    const predictedTime = predictTimeFromVO2max(vo2max, target.distance);
    const pr = target.prType ? prs.get(target.prType) : null;

    return {
      ...target,
      predictedTime,
      pace: predictedTime ? predictedTime / target.distance : null,
      prTime: pr?.value ?? null,
      prGap: predictedTime && pr ? predictedTime - pr.value : null,
    };
  });
}

export function buildRacePredictions(
  knownTime: number,
  knownDistance: number,
  personalRecords: Pick<PersonalRecord, "type" | "value">[] = []
) {
  const prs = new Map(personalRecords.map((record) => [record.type, record]));

  return RACE_TARGETS.map((target) => {
    const predictedTime = predictRaceTime(
      knownTime,
      knownDistance,
      target.distance
    );
    const pr = target.prType ? prs.get(target.prType) : null;

    return {
      ...target,
      predictedTime,
      pace: predictedTime ? predictedTime / target.distance : null,
      prTime: pr?.value ?? null,
      prGap: predictedTime && pr ? predictedTime - pr.value : null,
    };
  });
}

export function estimateHrVo2Max(
  profile: Pick<Profile, "max_hr" | "resting_hr"> | null
) {
  return vo2maxFromHr(profile?.max_hr ?? null, profile?.resting_hr ?? null);
}

export function estimatePaceVo2Max(timeSeconds: number, distanceKm: number) {
  return vo2maxFromPace(timeSeconds, distanceKm);
}

export function estimateBestPaceVo2Max(
  personalRecords: Pick<PersonalRecord, "type" | "value">[]
) {
  const candidates = personalRecords.flatMap((record) => {
    if (record.type === "5k") return [{ time: record.value, distance: 5 }];
    if (record.type === "10k") return [{ time: record.value, distance: 10 }];
    return [];
  });

  const estimates = candidates
    .map((candidate) => estimatePaceVo2Max(candidate.time, candidate.distance))
    .filter((value): value is number => value !== null);

  return estimates.length ? Math.max(...estimates) : null;
}

function isRecentRun(run: Pick<Run, "date">, today: Date, days = 90) {
  const cutoff = addDays(today, -days).toISOString().slice(0, 10);
  return run.date >= cutoff;
}

export function findBestPredictorAnchor(runs: Run[], today = new Date()) {
  const recentRuns = runs.filter((run) => isRecentRun(run, today));

  for (const targetDistance of PREDICTOR_ROLLING_WINDOWS) {
    let bestRolling: PredictorAnchor | null = null;

    for (const run of recentRuns) {
      if (run.raw_splits.length < targetDistance) continue;

      for (
        let start = 0;
        start <= run.raw_splits.length - targetDistance;
        start += 1
      ) {
        const window = run.raw_splits.slice(start, start + targetDistance);
        if (window.some((split) => split.is_stop)) continue;

        const time = window.reduce((sum, split) => sum + split.pace, 0);
        const candidate: PredictorAnchor = {
          source: "rolling",
          runId: run.id,
          runTitle: run.title,
          runDate: run.date,
          runSource: run.source,
          distance: targetDistance,
          time,
          pace: time / targetDistance,
          containsStops: false,
        };

        if (!bestRolling || candidate.pace < bestRolling.pace) {
          bestRolling = candidate;
        }
      }
    }

    if (bestRolling) return bestRolling;
  }

  return (
    recentRuns
      .filter((run) => run.distance > 0 && run.avg_pace > 0)
      .map<PredictorAnchor>((run) => ({
        source: "whole-run",
        runId: run.id,
        runTitle: run.title,
        runDate: run.date,
        runSource: run.source,
        distance: run.distance,
        time: run.moving_time || Math.round(run.avg_pace * run.distance),
        pace: run.avg_pace,
        containsStops: run.raw_splits.some((split) => split.is_stop),
      }))
      .sort((a, b) => a.pace - b.pace)[0] ?? null
  );
}

export function buildMonthlyVo2Trend(runs: Run[], today = new Date()) {
  const start = addDays(today, -183).toISOString().slice(0, 10);
  const buckets = new Map<string, Run[]>();

  for (const run of runs) {
    if (run.date < start) continue;
    const month = run.date.slice(0, 7);
    buckets.set(month, [...(buckets.get(month) ?? []), run]);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, monthRuns]) => {
      const anchor = findBestPredictorAnchor(
        monthRuns,
        new Date(`${month}-28T00:00:00Z`)
      );
      const vo2max = anchor
        ? vo2maxFromPace(anchor.time, anchor.distance)
        : null;
      return vo2max ? { month, vo2max } : null;
    })
    .filter(
      (point): point is { month: string; vo2max: number } => point !== null
    );
}

export function getWorkingVo2max(
  paceVo2max: number | null,
  hrVo2max: number | null
) {
  if (paceVo2max === null) return null;
  if (hrVo2max === null) return paceVo2max;
  if (Math.abs(paceVo2max - hrVo2max) <= 5) {
    return roundOne((paceVo2max + hrVo2max) / 2);
  }
  return paceVo2max;
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
