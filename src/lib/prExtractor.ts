import type { SupabaseClient } from "@supabase/supabase-js";

import type { PersonalRecord, PersonalRecordType, Run, Split } from "@/types";
import type { Database, TablesInsert } from "@/types/supabase";

type PersonalRecordInsert = TablesInsert<"personal_records">;

interface PrCandidate {
  type: PersonalRecordType;
  value: number;
  runId: string;
  achievedAt: string;
}

const FIXED_DISTANCE_PRS: Array<{ type: PersonalRecordType; km: number }> = [
  { type: "400m", km: 0.4 },
  { type: "half_mile", km: 0.804672 },
  { type: "1k", km: 1 },
  { type: "1_mile", km: 1.609344 },
  { type: "2_mile", km: 3.218688 },
  { type: "5k", km: 5 },
  { type: "10k", km: 10 },
  { type: "15k", km: 15 },
  { type: "10_mile", km: 16.09344 },
  { type: "20k", km: 20 },
  { type: "half_marathon", km: 21.0975 },
  { type: "30k", km: 30 },
  { type: "marathon", km: 42.195 },
  { type: "50k", km: 50 },
  { type: "50_mile", km: 80.4672 },
  { type: "100k", km: 100 },
  { type: "100_mile", km: 160.9344 },
  { type: "200k", km: 200 },
];

const DURATION_PRS: Array<{ type: PersonalRecordType; seconds: number }> = [
  { type: "24h", seconds: 24 * 60 * 60 },
  { type: "48h", seconds: 48 * 60 * 60 },
];

const MIN_DURATION_COMPLETION_RATIO = 0.95;

function distanceToleranceKm(targetKm: number) {
  return Math.min(0.02, targetKm * 0.001);
}

function isTimePr(type: PersonalRecordType) {
  return FIXED_DISTANCE_PRS.some((record) => record.type === type);
}

function isImprovement(
  type: PersonalRecordType,
  value: number,
  existing: number
) {
  return isTimePr(type) ? value < existing : value > existing;
}

function betterCandidate(
  type: PersonalRecordType,
  current: PrCandidate | null,
  next: PrCandidate | null
) {
  if (!next) return current;
  if (!current || isImprovement(type, next.value, current.value)) return next;
  return current;
}

function splitDistance(splits: Split[], index: number) {
  const previousKm = index > 0 ? splits[index - 1].km : 0;
  return Math.max(0, splits[index].km - previousKm) || 1;
}

export function bestTimeForDistance(splits: Split[], targetKm: number) {
  if (splits.length === 0 || targetKm <= 0) return null;

  let best = Infinity;
  for (let start = 0; start < splits.length; start += 1) {
    let distance = 0;
    let totalTime = 0;

    for (let index = start; index < splits.length; index += 1) {
      const current = splits[index];
      if (current.is_stop) break;

      const currentDistance = splitDistance(splits, index);
      const remaining = targetKm - distance;
      const usedDistance = Math.min(currentDistance, remaining);
      totalTime += current.pace * (usedDistance / currentDistance);
      distance += usedDistance;

      if (distance >= targetKm) {
        best = Math.min(best, Math.round(totalTime));
        break;
      }
    }
  }

  return best === Infinity ? null : best;
}

function estimatedTimeForDistance(run: Run, targetKm: number) {
  if (run.distance < targetKm - distanceToleranceKm(targetKm)) return null;
  if (run.distance <= 0 || run.moving_time <= 0) return null;
  return Math.round((run.moving_time / run.distance) * targetKm);
}

function bestDistanceForDuration(run: Run, targetSeconds: number) {
  if (run.moving_time <= 0) return null;
  if (run.moving_time < targetSeconds * MIN_DURATION_COMPLETION_RATIO) {
    return null;
  }
  if (run.moving_time <= targetSeconds) return run.distance;

  let elapsed = 0;
  let distance = 0;
  for (let index = 0; index < run.raw_splits.length; index += 1) {
    const current = run.raw_splits[index];
    const currentDistance = splitDistance(run.raw_splits, index);
    if (elapsed + current.pace > targetSeconds) {
      return (
        distance + currentDistance * ((targetSeconds - elapsed) / current.pace)
      );
    }
    elapsed += current.pace;
    distance += currentDistance;
  }

  return run.distance * (targetSeconds / run.moving_time);
}

export function interpolatePrTime(
  knownTime: number,
  knownDistance: number,
  targetDistance: number
) {
  return Math.round(knownTime * Math.pow(targetDistance / knownDistance, 1.06));
}

export function computePersonalRecords(runs: Run[]): PersonalRecordInsert[] {
  const best = new Map<PersonalRecordType, PrCandidate>();

  for (const run of runs) {
    for (const { type, km } of FIXED_DISTANCE_PRS) {
      const value =
        bestTimeForDistance(run.raw_splits, km) ??
        estimatedTimeForDistance(run, km);
      const candidate: PrCandidate | null = value
        ? { type, value, runId: run.id, achievedAt: run.date }
        : null;

      const nextBest = betterCandidate(type, best.get(type) ?? null, candidate);
      if (nextBest) best.set(type, nextBest);
    }

    for (const { type, seconds } of DURATION_PRS) {
      const value = bestDistanceForDuration(run, seconds);
      const candidate: PrCandidate | null = value
        ? { type, value, runId: run.id, achievedAt: run.date }
        : null;
      const nextBest = betterCandidate(type, best.get(type) ?? null, candidate);
      if (nextBest) best.set(type, nextBest);
    }

    best.set(
      "longest_run",
      betterCandidate("longest_run", best.get("longest_run") ?? null, {
        type: "longest_run",
        value: run.distance,
        runId: run.id,
        achievedAt: run.date,
      })!
    );
    best.set(
      "longest_duration",
      betterCandidate(
        "longest_duration",
        best.get("longest_duration") ?? null,
        {
          type: "longest_duration",
          value: run.moving_time,
          runId: run.id,
          achievedAt: run.date,
        }
      )!
    );

    if (run.elevation_gain > 0) {
      best.set(
        "most_elevation",
        betterCandidate("most_elevation", best.get("most_elevation") ?? null, {
          type: "most_elevation",
          value: run.elevation_gain,
          runId: run.id,
          achievedAt: run.date,
        })!
      );
      best.set(
        "best_d_plus_per_km",
        betterCandidate(
          "best_d_plus_per_km",
          best.get("best_d_plus_per_km") ?? null,
          {
            type: "best_d_plus_per_km",
            value: run.elevation_gain / Math.max(run.distance, 0.001),
            runId: run.id,
            achievedAt: run.date,
          }
        )!
      );
    }
  }

  return [...best.values()].map((record) => ({
    user_id: runs[0]?.user_id ?? "",
    type: record.type,
    value: record.value,
    run_id: record.runId,
    achieved_at: record.achievedAt,
  }));
}

export async function recalculatePersonalRecords(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;

  const records = computePersonalRecords((data ?? []) as unknown as Run[]);
  const { error: deleteError } = await supabase
    .from("personal_records")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (records.length === 0) return [];

  const { data: savedRecords, error: upsertError } = await supabase
    .from("personal_records")
    .upsert(records)
    .select("*");

  if (upsertError) throw upsertError;
  return (savedRecords ?? []) as unknown as PersonalRecord[];
}

export async function extractAndUpdatePRs(
  _run: Run,
  userId: string,
  supabase: SupabaseClient<Database>
) {
  return recalculatePersonalRecords(supabase, userId);
}
