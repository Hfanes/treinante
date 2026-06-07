# PRD 09 — Segment Hunter

## Overview

Define repeatable route segments and automatically match them against imported GPS tracks. Tracks effort history, shows progress toward personal bests, and surfaces KOM gaps. Works for any repeatable stretch — a climb, a flat fast section, a trail loop.

---

## Segment definition

A segment is a start-to-end GPS stretch. Created by the user, optionally with a KOM/CR time for comparison.

### Creating a segment

**Method A — Manual coordinate entry:**

- Name (required)
- Start lat/lng (required)
- End lat/lng (required)
- Approximate distance (optional — measured from GPS on first match)
- KOM/CR time (optional, MM:SS)

**Method B — From a run:**
On the Run Detail page: "Create segment from this run"

- User enters start km and end km
- App extracts GPS coordinates from `raw_splits` at those marks
- Pre-fills segment form with coordinates, measured distance, and the elapsed time for that stretch

**Strava starred segments (optional):**
Settings → Segments → "Import starred Strava segments"
Uses `GET /segments/starred`. Imports name, distance, start/end lat-lng, KOM time.

---

## Auto-matching

Runs on every GPX or Strava import (not manual runs — no GPS data).

```typescript
// /src/lib/segmentMatcher.ts
const PROXIMITY_METRES = 50;

function matchSegment(segment: Segment, splits: Split[]): SegmentMatch | null {
  const startMatch = findClosestPoint(
    splits,
    segment.start_lat!,
    segment.start_lng!
  );
  if (!startMatch || startMatch.distanceMetres > PROXIMITY_METRES) return null;

  const remainingSplits = splits.slice(startMatch.index);
  const endMatch = findClosestPoint(
    remainingSplits,
    segment.end_lat!,
    segment.end_lng!
  );
  if (!endMatch || endMatch.distanceMetres > PROXIMITY_METRES) return null;

  const elapsedTime = endMatch.timestamp - startMatch.timestamp;
  const segmentSplits = remainingSplits.slice(0, endMatch.index + 1);
  const avgHr = mean(segmentSplits.map((s) => s.hr).filter(Boolean));

  return { elapsed_time: elapsedTime, avg_hr: avgHr ?? null };
}
```

Requires `lat`, `lng`, and `timestamp` on each Split (stored in `raw_splits` jsonb). Timestamp derived from GPX `<time>` elements or Strava streams `time` array.

On match: insert `segment_efforts` row. Update `segments.best_time` if this is a new PR for this segment.

**Re-match all runs:** Available from Settings → Segments for when a new segment is added and the user wants to find historical efforts.

---

## Segments page (`/segments`)

### Segment list

Table with one row per segment, sorted alphabetically by default:

| Column    | Notes                                                        |
| --------- | ------------------------------------------------------------ |
| Name      | Clickable → detail                                           |
| Distance  | km                                                           |
| Best time | MM:SS                                                        |
| Date      | of best effort                                               |
| Efforts   | count                                                        |
| Avg time  | MM:SS                                                        |
| Trend     | ↗ improving / ↘ declining based on last 3 vs first 3 efforts |
| KOM gap   | "+1:24 behind" or "—"                                        |
| Badges    | 🔥 within 5% of own PR · 🏆 within 10% of KOM                |

### Badge logic

```typescript
function getSegmentBadges(
  segment: Segment,
  latestEffort: SegmentEffort | null
) {
  const badges: string[] = [];
  if (!latestEffort) return badges;

  const gapToPR =
    (latestEffort.elapsed_time - segment.best_time!) / segment.best_time!;
  if (gapToPR <= 0.05) badges.push("🔥");

  if (segment.kom_time) {
    const gapToKOM =
      (latestEffort.elapsed_time - segment.kom_time) / segment.kom_time;
    if (gapToKOM <= 0.1) badges.push("🏆");
  }

  return badges;
}
```

---

## Segment detail view

Header: name, distance, best time, KOM time + gap.

**Effort history chart:**

Chart.js line chart:

- X-axis: date of each effort
- Left Y-axis: elapsed time (inverted — faster higher), format MM:SS
- Right Y-axis: avg HR (if available)
- Dashed reference: PR time
- Dashed reference: KOM time (if set)

**Effort history table:**

| Date   | Time | vs PR | vs KOM | Avg HR | Run |
| ------ | ---- | ----- | ------ | ------ | --- |
| Jan 14 | 8:42 | PR 🔥 | +1:12  | 162    | →   |
| Dec 20 | 9:14 | +0:32 | +1:44  | 158    | →   |

**KOM gap panel (if KOM set):**

```
KOM: 7:30
Your best: 8:42
Gap: +1:12 (+16%)
```

---

## Segment management

Each row in the segment list:

- Edit: update name, KOM time, coordinates
- Delete: confirm → deletes segment and all its efforts

Empty state: "No segments yet — define your first segment to start tracking your progress on specific routes."
