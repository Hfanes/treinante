import { describe, expect, it } from "vitest";

import {
  buildWeeklyReport,
  getPreviousWeekStart,
  getWeekStart,
} from "./reportEngine";
import type { Profile, Run } from "@/types";

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
    id: overrides.id ?? "run-1",
    user_id: "user-1",
    title: "Run",
    date: "2026-06-02",
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
    created_at: "2026-06-02T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
    ...overrides,
  };
}

describe("weekly report engine", () => {
  it("finds Monday week starts and previous completed weeks", () => {
    expect(getWeekStart(new Date("2026-06-10T12:00:00Z"))).toBe("2026-06-08");
    expect(getWeekStart(new Date("2026-06-14T12:00:00Z"))).toBe("2026-06-08");
    expect(getPreviousWeekStart(new Date("2026-06-09T12:00:00Z"))).toBe(
      "2026-06-01"
    );
  });

  it("builds report totals, deltas, fitness state, and insights", () => {
    const report = buildWeeklyReport(
      "user-1",
      "2026-06-01",
      [
        run({
          id: "previous",
          date: "2026-05-27",
          distance: 8,
          moving_time: 3200,
        }),
        run({
          id: "a",
          date: "2026-06-02",
          distance: 10,
          moving_time: 3600,
          avg_hr: 140,
          elevation_gain: 120,
        }),
        run({
          id: "b",
          date: "2026-06-05",
          distance: 12,
          moving_time: 3900,
          avg_hr: 172,
          ctl_at_date: 30.2,
          atl_at_date: 25.1,
          tsb_at_date: 5.1,
        }),
      ],
      profile
    );

    expect(report).toMatchObject({
      total_km: 22,
      total_d_plus: 120,
      total_time: 7500,
      num_runs: 2,
      avg_pace: 341,
      avg_hr: 156,
      ctl_end: 30.2,
      atl_end: 25.1,
      tsb_end: 5.1,
      vs_prev_km_delta: 14,
      vs_prev_time_delta: 4300,
      zone_breakdown: { z2: 48, z3: 0, z4: 52 },
    });
    expect(report?.insight_text).toContain("Last week you ran 22 km");
  });

  it("returns null when a week has no runs", () => {
    expect(buildWeeklyReport("user-1", "2026-06-01", [], profile)).toBeNull();
  });

  it("hides optional HR and elevation fields when source data is missing", () => {
    const report = buildWeeklyReport(
      "user-1",
      "2026-06-01",
      [run({ avg_hr: null })],
      profile
    );

    expect(report).toMatchObject({
      avg_hr: null,
      total_d_plus: null,
      zone_breakdown: null,
    });
  });

  it("rounds average HR for integer database storage", () => {
    const report = buildWeeklyReport(
      "user-1",
      "2026-06-01",
      [run({ id: "a", avg_hr: 170 }), run({ id: "b", avg_hr: 171 })],
      profile
    );

    expect(report?.avg_hr).toBe(171);
  });

  it("coerces numeric database strings before report math", () => {
    const report = buildWeeklyReport(
      "user-1",
      "2026-06-01",
      [
        run({
          distance: "10.5" as unknown as number,
          moving_time: "3600" as unknown as number,
          avg_hr: "145" as unknown as number,
          elevation_gain: "42" as unknown as number,
          ctl_at_date: "12.5" as unknown as number,
          atl_at_date: "15.2" as unknown as number,
          tsb_at_date: "-2.7" as unknown as number,
        }),
      ],
      {
        ...profile,
        weekly_km_goal: "35" as unknown as number,
        max_hr: "190" as unknown as number,
      }
    );

    expect(report).toMatchObject({
      total_km: 10.5,
      total_d_plus: 42,
      total_time: 3600,
      avg_pace: 343,
      avg_hr: 145,
      ctl_end: 12.5,
      atl_end: 15.2,
      tsb_end: -2.7,
      zone_breakdown: { z2: 100, z3: 0, z4: 0 },
    });
    expect(report?.insight_text).not.toContain("NaN");
  });
});
