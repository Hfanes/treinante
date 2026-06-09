import { describe, expect, it } from "vitest";

import {
  buildRacePredictions,
  buildVo2RacePredictions,
  computeFitnessTimeSeries,
  computeTrainingLoad,
  countTrainingDays,
  estimateBestPaceVo2Max,
  estimateHrVo2Max,
  estimatePaceVo2Max,
  findBestPredictorAnchor,
  getCurrentFormLabel,
  getWorkingVo2max,
  hasOverreachingStreak,
  predictTimeFromVO2max,
  predictRaceTime,
} from "./calculations";
import type { PersonalRecord, Profile, Run, Split } from "@/types";

const profile: Profile = {
  id: "user-1",
  name: "Runner",
  weekly_km_goal: 40,
  max_hr: 190,
  resting_hr: 45,
  ftp_pace: 300,
  strava_connected: false,
  onboarding_complete: true,
};

function run(overrides: Partial<Run>): Run {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: "user-1",
    title: "Run",
    date: "2026-06-01",
    start_time: null,
    source: "gpx",
    sport_type: "Run",
    strava_activity_id: null,
    distance: 10,
    total_time: 3600,
    moving_time: 3600,
    avg_hr: 150,
    max_hr: null,
    avg_power: null,
    max_power: null,
    elevation_gain: 0,
    elevation_loss: 0,
    avg_pace: 360,
    start_lat: null,
    start_lng: null,
    end_lat: null,
    end_lng: null,
    summary_polyline: null,
    gpx_file_url: null,
    raw_splits: [],
    raw_source: {},
    training_load: null,
    ctl_at_date: null,
    atl_at_date: null,
    tsb_at_date: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function split(km: number, pace: number, isStop = false): Split {
  return {
    km,
    pace,
    hr: null,
    elevation: 0,
    gap: pace,
    is_stop: isStop,
    lat: null,
    lng: null,
  };
}

describe("fitness calculations", () => {
  it("computes training load from heart rate intensity", () => {
    expect(
      computeTrainingLoad(run({ moving_time: 3600, avg_hr: 152 }), profile)
    ).toBe(52);
  });

  it("falls back to pace intensity when heart rate is unavailable", () => {
    expect(
      computeTrainingLoad(
        run({ avg_hr: null, avg_pace: 375, moving_time: 3600 }),
        profile
      )
    ).toBe(52);
  });

  it("builds a daily CTL ATL TSB series through today", () => {
    const series = computeFitnessTimeSeries(
      [run({ date: "2026-06-01" }), run({ date: "2026-06-03" })],
      profile,
      new Date("2026-06-04T00:00:00Z")
    );

    expect(series).toHaveLength(4);
    expect(series.map((point) => point.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
    ]);
    expect(series.at(-1)).toMatchObject({ date: "2026-06-04" });
  });

  it("counts unique training days for the app-wide threshold", () => {
    expect(
      countTrainingDays([
        run({ date: "2026-06-01" }),
        run({ date: "2026-06-01" }),
        run({ date: "2026-06-02" }),
      ])
    ).toBe(2);
  });

  it("classifies form labels from PRD thresholds", () => {
    expect(getCurrentFormLabel(16)).toBe("Fresh");
    expect(getCurrentFormLabel(10)).toBe("Optimal");
    expect(getCurrentFormLabel(0)).toBe("Neutral");
    expect(getCurrentFormLabel(-15)).toBe("Fatigued");
    expect(getCurrentFormLabel(-21)).toBe("Overreaching");
  });

  it("detects three-day overreaching streaks", () => {
    expect(
      hasOverreachingStreak([
        { date: "2026-06-01", ctl: 10, atl: 35, tsb: -25 },
        { date: "2026-06-02", ctl: 10, atl: 32, tsb: -22 },
        { date: "2026-06-03", ctl: 11, atl: 33, tsb: -22 },
      ])
    ).toBe(true);
  });
});

describe("race predictor calculations", () => {
  it("predicts race times with the Riegel formula", () => {
    expect(predictRaceTime(1200, 5, 10)).toBe(2502);
    expect(predictRaceTime(0, 5, 10)).toBeNull();
  });

  it("builds standard race predictions with PR gaps", () => {
    const records: Pick<PersonalRecord, "type" | "value">[] = [
      { type: "5k", value: 1190 },
      { type: "10k", value: 2550 },
    ];
    const predictions = buildRacePredictions(1200, 5, records);
    const byKey = new Map(
      predictions.map((prediction) => [prediction.key, prediction])
    );

    expect(byKey.get("5k")?.predictedTime).toBe(1200);
    expect(byKey.get("5k")?.prGap).toBe(10);
    expect(byKey.get("10k")?.prGap).toBe(-48);
  });

  it("estimates VO2max from heart rate and race pace", () => {
    expect(estimateHrVo2Max(profile)).toBe(63.3);
    expect(estimatePaceVo2Max(1200, 5)).toBe(49.8);
  });

  it("uses the best 5k or 10k PR for pace-based VO2max", () => {
    expect(
      estimateBestPaceVo2Max([
        { type: "5k", value: 1200 },
        { type: "10k", value: 2500 },
        { type: "21k", value: 5400 },
      ])
    ).toBe(49.8);
  });

  it("prioritizes standard rolling windows by distance before pace", () => {
    const anchor = findBestPredictorAnchor(
      [
        run({
          id: "longer-window",
          date: "2026-06-01",
          distance: 10,
          moving_time: 3300,
          avg_pace: 330,
          raw_splits: [1, 2, 3, 4, 5].map((km) => split(km, 330)),
        }),
        run({
          id: "shorter-faster-window",
          date: "2026-06-02",
          distance: 5,
          moving_time: 1400,
          avg_pace: 280,
          raw_splits: [1, 2, 3].map((km) => split(km, 250)),
        }),
      ],
      new Date("2026-06-09T00:00:00Z")
    );

    expect(anchor).toMatchObject({
      source: "rolling",
      runId: "longer-window",
    });
    expect(anchor?.distance).toBe(5);
    expect(anchor?.time).toBe(1650);
  });

  it("falls back to whole-run pace when no rolling window exists", () => {
    const anchor = findBestPredictorAnchor(
      [
        run({ id: "manual", source: "manual", distance: 5, avg_pace: 360 }),
        run({ id: "tempo", distance: 5, avg_pace: 330 }),
      ],
      new Date("2026-06-09T00:00:00Z")
    );

    expect(anchor).toMatchObject({ source: "whole-run", runId: "tempo" });
  });

  it("builds VO2-derived predictions and working VO2max", () => {
    expect(getWorkingVo2max(50, 54)).toBe(52);
    expect(getWorkingVo2max(50, 58)).toBe(50);
    expect(predictTimeFromVO2max(50, 5)).toBeGreaterThan(0);
    expect(buildVo2RacePredictions(50)[0].predictedTime).toBeGreaterThan(0);
  });
});
