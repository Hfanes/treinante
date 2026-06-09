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

const TIME_PRS: Array<{ type: PersonalRecordType; km: number }> = [
  { type: "1k", km: 1 },
  { type: "5k", km: 5 },
  { type: "10k", km: 10 },
  { type: "21k", km: 21 },
  { type: "42k", km: 42 },
];

const ESTIMATE_THRESHOLDS: Partial<Record<PersonalRecordType, number>> = {
  "21k": 15,
  "42k": 35,
};

function isTimePr(type: PersonalRecordType) {
  return ["1k", "5k", "10k", "21k", "42k"].includes(type);
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

export function bestTimeForDistance(splits: Split[], targetKm: number) {
  if (splits.length < targetKm) return null;

  let best = Infinity;
  for (let index = 0; index <= splits.length - targetKm; index += 1) {
    const window = splits.slice(index, index + targetKm);
    if (window.some((split) => split.is_stop)) continue;
    const totalTime = window.reduce((sum, split) => sum + split.pace, 0);
    if (totalTime < best) best = totalTime;
  }

  return best === Infinity ? null : best;
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
    for (const { type, km } of TIME_PRS) {
      const exact = bestTimeForDistance(run.raw_splits, km);
      let candidate: PrCandidate | null = exact
        ? { type, value: exact, runId: run.id, achievedAt: run.date }
        : null;
      const estimateThreshold = ESTIMATE_THRESHOLDS[type];

      if (
        !candidate &&
        estimateThreshold &&
        run.distance >= estimateThreshold &&
        run.distance < km
      ) {
        candidate = {
          type,
          value: interpolatePrTime(run.moving_time, run.distance, km),
          runId: run.id,
          achievedAt: run.date,
        };
      }

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
