import { describe, expect, it } from "vitest";

import {
  bestTimeForDistance,
  computePersonalRecords,
  interpolatePrTime,
} from "./prExtractor";
import type { Run, Split } from "@/types";

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

function run(overrides: Partial<Run>): Run {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: "user-1",
    title: "Run",
    date: "2026-06-09",
    start_time: null,
    source: "gpx",
    sport_type: "Run",
    strava_activity_id: null,
    distance: 5,
    total_time: 1800,
    moving_time: 1800,
    avg_hr: null,
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
    created_at: "2026-06-09T00:00:00Z",
    updated_at: "2026-06-09T00:00:00Z",
    ...overrides,
  };
}

describe("PR extraction", () => {
  it("finds the fastest rolling split window and skips stops", () => {
    expect(
      bestTimeForDistance(
        [split(1, 300), split(2, 500, true), split(3, 310), split(4, 305)],
        2
      )
    ).toBe(615);
  });

  it("interpolates longer distance estimates with Riegel", () => {
    expect(interpolatePrTime(5400, 18, 21)).toBe(6359);
  });

  it("computes time and distance records across runs", () => {
    const records = computePersonalRecords([
      run({
        id: "slow-5k",
        distance: 5,
        moving_time: 1800,
        raw_splits: [1, 2, 3, 4, 5].map((km) => split(km, 360)),
      }),
      run({
        id: "fast-5k",
        distance: 5,
        moving_time: 1700,
        raw_splits: [1, 2, 3, 4, 5].map((km) => split(km, 340)),
      }),
      run({ id: "long", distance: 18, moving_time: 5400 }),
      run({ id: "hill", distance: 8, elevation_gain: 800 }),
    ]);
    const byType = new Map(records.map((record) => [record.type, record]));

    expect(byType.get("5k")?.run_id).toBe("fast-5k");
    expect(byType.get("5k")?.value).toBe(1700);
    expect(byType.get("21k")?.run_id).toBe("long");
    expect(byType.get("longest_run")?.value).toBe(18);
    expect(byType.get("most_elevation")?.value).toBe(800);
    expect(byType.get("best_d_plus_per_km")?.value).toBe(100);
  });

  it("does not create elevation records without elevation data", () => {
    const records = computePersonalRecords([run({ distance: 5 })]);
    const types = records.map((record) => record.type);

    expect(types).not.toContain("most_elevation");
    expect(types).not.toContain("best_d_plus_per_km");
  });
});
