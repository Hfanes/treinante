import type { EffortZone, Profile, Run, Split } from "@/types";

export interface AnalyzedSplit extends Omit<Split, "gap"> {
  gap: number | null;
  elevationDelta: number | null;
}

export interface CardiacDrift {
  drift: number;
  avgFirst: number;
  avgSecond: number;
  severity: "neutral" | "moderate" | "high" | "very_high";
}

export interface RunAnalysis {
  zone: EffortZone | null;
  splits: AnalyzedSplit[];
  wholeRunGap: number | null;
  dPlusPerKm: number | null;
  cardiacDrift: CardiacDrift | null;
  stopCount: number;
  stopRatio: number;
  flatEquivalentDistance: number | null;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function classifyZone(avgHr: number | null, maxHr: number | null) {
  if (!avgHr || !maxHr) return null;
  const pct = avgHr / maxHr;
  if (pct < 0.81) return "z2";
  if (pct < 0.9) return "z3";
  return "z4";
}

export function classifyZoneByPace(
  avgPace: number,
  ftpPace: number | null
): EffortZone | null {
  if (!ftpPace) return null;
  if (avgPace > ftpPace + 30) return "z2";
  if (avgPace > ftpPace - 30) return "z3";
  return "z4";
}

export function computeGap(
  paceSecPerKm: number,
  elevationDeltaM: number,
  distanceM: number
) {
  if (distanceM <= 0) return null;
  const gradientPct = (elevationDeltaM / distanceM) * 100;
  const clampedGradient = Math.max(-30, Math.min(30, gradientPct));
  const adjustment =
    clampedGradient > 0 ? clampedGradient * 8 : clampedGradient * 4;

  return Math.max(1, Math.round(paceSecPerKm - adjustment));
}

export function computeAnalyzedSplits(run: Run): AnalyzedSplit[] {
  if (run.raw_splits.length === 0) return [];

  const startElevation =
    typeof run.raw_source.start_elevation === "number"
      ? run.raw_source.start_elevation
      : null;

  return run.raw_splits.map((split, index, splits) => {
    const previousElevation =
      index > 0 ? splits[index - 1].elevation : startElevation;
    const elevationDelta =
      previousElevation === null ? null : split.elevation - previousElevation;
    const gap =
      run.elevation_gain >= 10 && elevationDelta !== null
        ? computeGap(split.pace, elevationDelta, 1000)
        : null;

    return { ...split, elevationDelta, gap };
  });
}

export function computeCardiacDrift(
  splits: Array<Pick<Split, "hr">>
): CardiacDrift | null {
  const withHr = splits.filter(
    (split): split is Split & { hr: number } => split.hr !== null
  );
  if (withHr.length < 4) return null;

  const mid = Math.floor(withHr.length / 2);
  const avgFirst = Math.round(
    mean(withHr.slice(0, mid).map((split) => split.hr))
  );
  const avgSecond = Math.round(
    mean(withHr.slice(mid).map((split) => split.hr))
  );
  const drift = avgSecond - avgFirst;
  const severity =
    drift > 15
      ? "very_high"
      : drift > 8
        ? "high"
        : drift >= 5
          ? "moderate"
          : "neutral";

  return { drift, avgFirst, avgSecond, severity };
}

export function analyzeRun(
  run: Run,
  profile: Pick<Profile, "max_hr" | "ftp_pace"> | null
): RunAnalysis {
  const splits = computeAnalyzedSplits(run);
  const zone =
    classifyZone(run.avg_hr, profile?.max_hr ?? null) ??
    classifyZoneByPace(run.avg_pace, profile?.ftp_pace ?? null);
  const gaps = splits
    .map((split) => split.gap)
    .filter((gap): gap is number => gap !== null);
  const wholeRunGap = gaps.length ? Math.round(mean(gaps)) : null;
  const stopCount = splits.filter((split) => split.is_stop).length;
  const flatEquivalentDistance = wholeRunGap
    ? Number((run.moving_time / wholeRunGap || 0).toFixed(1))
    : null;

  return {
    zone,
    splits,
    wholeRunGap,
    dPlusPerKm:
      run.elevation_gain > 0 ? run.elevation_gain / run.distance : null,
    cardiacDrift: computeCardiacDrift(splits),
    stopCount,
    stopRatio: splits.length ? stopCount / splits.length : 0,
    flatEquivalentDistance,
  };
}

export function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function formatPace(seconds: number) {
  return `${formatDuration(seconds)} /km`;
}
