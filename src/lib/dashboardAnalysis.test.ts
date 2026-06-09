import { describe, expect, it } from "vitest";

import { buildDashboardData, computeLongestStreak } from "./dashboardAnalysis";
import type { Run } from "@/types";

function run(overrides: Partial<Run>): Run {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: "user-1",
    title: "Run",
    date: "2026-06-01",
    start_time: null,
    source: "manual",
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
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("dashboard analysis", () => {
  it("computes longest consecutive run streak", () => {
    expect(
      computeLongestStreak([
        run({ date: "2026-06-01" }),
        run({ date: "2026-06-02" }),
        run({ date: "2026-06-04" }),
        run({ date: "2026-06-05" }),
        run({ date: "2026-06-06" }),
      ])
    ).toBe(3);
  });

  it("builds summary cards from current run history", () => {
    const data = buildDashboardData(
      [
        run({ date: "2026-06-08", distance: 8, avg_hr: 140 }),
        run({
          date: "2026-06-09",
          distance: 7,
          avg_hr: 150,
          elevation_gain: 120,
        }),
        run({ date: "2026-05-20", distance: 10 }),
      ],
      { weekly_km_goal: 30, max_hr: 180, ftp_pace: null },
      new Date("2026-06-09T12:00:00Z")
    );

    expect(data.summary.currentWeekKm).toBe(15);
    expect(data.summary.last30DaysKm).toBe(25);
    expect(data.summary.totalRuns).toBe(3);
    expect(data.hasHrData).toBe(true);
    expect(data.elevationRunCount).toBe(1);
  });

  it("builds 12 weekly buckets", () => {
    const data = buildDashboardData(
      [run({ date: "2026-06-09", distance: 7 })],
      { weekly_km_goal: 30, max_hr: null, ftp_pace: null },
      new Date("2026-06-09T12:00:00Z")
    );

    expect(data.weeklyBuckets).toHaveLength(12);
    expect(data.weeklyBuckets.at(-1)?.totalKm).toBe(7);
  });
});
