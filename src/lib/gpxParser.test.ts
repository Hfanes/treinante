import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";
import { parseGPX } from "./gpxParser";

beforeAll(() => {
  global.DOMParser = new JSDOM().window.DOMParser;
});

describe("parseGPX", () => {
  test("normalizes trackpoints into a run draft", () => {
    const run = parseGPX(`<?xml version="1.0"?>
      <gpx creator="test" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
        <trk>
          <name>Morning Run</name>
          <type>Run</type>
          <trkseg>
            <trkpt lat="0" lon="0">
              <ele>10</ele>
              <time>2026-06-09T10:00:00Z</time>
              <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
            </trkpt>
            <trkpt lat="0" lon="0.009">
              <ele>15</ele>
              <time>2026-06-09T10:05:00Z</time>
              <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
            </trkpt>
            <trkpt lat="0" lon="0.018">
              <ele>12</ele>
              <time>2026-06-09T10:10:00Z</time>
              <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>160</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
            </trkpt>
          </trkseg>
        </trk>
      </gpx>`);

    expect(run.title).toBe("Morning Run");
    expect(run.source).toBe("gpx");
    expect(run.date).toBe("2026-06-09");
    expect(run.distance).toBeGreaterThan(1.9);
    expect(run.avg_hr).toBe(150);
    expect(run.max_hr).toBe(160);
    expect(run.raw_splits.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects files without enough track data", () => {
    expect(() => parseGPX("<gpx><trk><trkseg></trkseg></trk></gpx>")).toThrow(
      "GPX file contains no track data"
    );
  });
});
