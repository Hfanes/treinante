import { describe, expect, test } from "vitest";

import { parseExportFile } from "./idb";

const userId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";

function exportFile(overrides: Record<string, unknown> = {}) {
  return {
    exported_at: "2026-06-22T00:00:00.000Z",
    version: 2,
    profile: null,
    runs: [
      {
        id: runId,
        user_id: userId,
        title: "Morning run",
        date: "2026-06-22",
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
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
        ...overrides,
      },
    ],
    personal_records: [],
    segments: [],
    segment_efforts: [],
    weekly_reports: [],
  };
}

describe("parseExportFile", () => {
  test("accepts a valid export", () => {
    expect(parseExportFile(exportFile()).runs[0].id).toBe(runId);
  });

  test("rejects invalid run values", () => {
    expect(() => parseExportFile(exportFile({ distance: -1 }))).toThrow(
      "Invalid run distance"
    );
  });
});
