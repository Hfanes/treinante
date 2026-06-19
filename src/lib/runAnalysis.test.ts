import { describe, expect, it } from "vitest";

import {
  analyzeRun,
  classifyZone,
  classifyZoneByLthr,
  classifyZoneByPace,
  computeCardiacDrift,
  computeGap,
} from "./runAnalysis";
import type { Run } from "@/types";

const baseRun: Run = {
  id: "run-1",
  user_id: "user-1",
  title: "Test run",
  date: "2026-06-09",
  start_time: null,
  source: "gpx",
  sport_type: "Run",
  strava_activity_id: null,
  distance: 4,
  total_time: 1600,
  moving_time: 1600,
  avg_hr: 150,
  max_hr: 170,
  avg_power: null,
  max_power: null,
  elevation_gain: 100,
  elevation_loss: 50,
  avg_pace: 400,
  start_lat: null,
  start_lng: null,
  end_lat: null,
  end_lng: null,
  summary_polyline: null,
  gpx_file_url: null,
  raw_splits: [
    {
      km: 1,
      pace: 390,
      hr: 140,
      elevation: 20,
      gap: 390,
      is_stop: false,
      lat: null,
      lng: null,
    },
    {
      km: 2,
      pace: 405,
      hr: 144,
      elevation: 55,
      gap: 405,
      is_stop: false,
      lat: null,
      lng: null,
    },
    {
      km: 3,
      pace: 420,
      hr: 153,
      elevation: 90,
      gap: 420,
      is_stop: false,
      lat: null,
      lng: null,
    },
    {
      km: 4,
      pace: 385,
      hr: 158,
      elevation: 100,
      gap: 385,
      is_stop: false,
      lat: null,
      lng: null,
    },
  ],
  raw_source: { start_elevation: 0 },
  training_load: null,
  ctl_at_date: null,
  atl_at_date: null,
  tsb_at_date: null,
  created_at: "2026-06-09T00:00:00Z",
  updated_at: "2026-06-09T00:00:00Z",
};

describe("run analysis", () => {
  it("classifies effort by heart-rate percentage first", () => {
    expect(classifyZone(120, 180)).toBe("z2");
    expect(classifyZone(155, 180)).toBe("z3");
    expect(classifyZone(170, 180)).toBe("z4");
  });

  it("falls back to pace zones", () => {
    expect(classifyZoneByPace(400, 360)).toBe("z2");
    expect(classifyZoneByPace(350, 360)).toBe("z3");
    expect(classifyZoneByPace(320, 360)).toBe("z4");
  });

  it("computes grade adjusted pace from gradient", () => {
    expect(computeGap(360, 25, 1000)).toBe(340);
    expect(computeGap(360, -25, 1000)).toBe(370);
  });

  it("computes cardiac drift from split halves", () => {
    expect(computeCardiacDrift(baseRun.raw_splits)).toEqual({
      drift: 14,
      avgFirst: 142,
      avgSecond: 156,
      severity: "high",
    });
  });

  it("builds a run analysis summary", () => {
    const analysis = analyzeRun(baseRun, {
      max_hr: 180,
      lthr: null,
      hr_zone_method: "max_hr",
      ftp_pace: null,
    });

    expect(analysis.zone).toBe("z3");
    expect(analysis.wholeRunGap).toBeLessThan(baseRun.avg_pace);
    expect(analysis.dPlusPerKm).toBe(25);
    expect(analysis.stopCount).toBe(0);
  });

  it("classifies zones from LTHR", () => {
    expect(classifyZoneByLthr(145, 170)).toBe("z2");
    expect(classifyZoneByLthr(155, 170)).toBe("z3");
    expect(classifyZoneByLthr(165, 170)).toBe("z4");
  });

  it("uses the selected HR method before threshold pace", () => {
    expect(
      analyzeRun(baseRun, {
        max_hr: 190,
        lthr: 160,
        hr_zone_method: "lthr",
        ftp_pace: 300,
      }).zone
    ).toBe("z4");
  });
});
