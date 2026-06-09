# PRD 09 — Segment Hunter

## Overview

Track personal progress on Strava segments. Automatically imports the
user's starred segments from Strava, matches them against imported
activities, and shows effort history and KOM gap. No manual segment
creation — Strava is the only source.

**Requires Strava connection.** Users without Strava see a locked state
with an explanation and a connect button.

---

## Strava-only gate

If Strava is not connected, the entire segments page shows:

```
[ SEGMENTS ]

Segment tracking requires Strava.

Strava defines segments — named stretches of road or trail that
runners around the world compete on. Connect your Strava account
to import your starred segments and track your progress.

[Connect Strava]
```

No other content is shown. No fallback for GPX-only users.

---

## Segment import

### Initial import (on Strava connect)

Fetch all starred segments via Strava API:

```
GET /segments/starred
```

For each segment returned:

- `id` → `strava_segment_id`
- `name`
- `distance` (metres → km)
- `start_latlng` → `start_lat`, `start_lng`
- `end_latlng` → `end_lat`, `end_lng`
- `xoms.kom` → `kom_time` (seconds) — the current KOM time

Store in `segments` table. No user input required.

### Keeping segments in sync

On every Strava sync ("Sync now" button in Settings):

- Re-fetch starred segments
- Add any newly starred segments
- Update KOM times (they change as people set new records)
- Do NOT delete segments the user has unstarred — they may have
  effort history. Mark them as `starred: false` and show with a
  "Unstarred on Strava" badge instead.

### Segment detail fetch

For each segment, fetch full detail on first match:

```
GET /segments/{id}
```

Stores: total elevation gain, average grade, max grade, segment type
(ride/run). Used for display only.

---

## Auto-matching

Runs on every activity import (GPX or Strava). Not run on manual entries.

```typescript
const PROXIMITY_METRES = 50;

function matchSegment(segment: Segment, splits: Split[]): SegmentMatch | null {
  // Find the split point closest to segment start
  const startMatch = findClosestPoint(
    splits,
    segment.start_lat,
    segment.start_lng
  );
  if (!startMatch || startMatch.distanceMetres > PROXIMITY_METRES) return null;

  // Find the split point closest to segment end, after the start match
  const remainingSplits = splits.slice(startMatch.index);
  const endMatch = findClosestPoint(
    remainingSplits,
    segment.end_lat,
    segment.end_lng
  );
  if (!endMatch || endMatch.distanceMetres > PROXIMITY_METRES) return null;

  const elapsedTime = endMatch.timestamp - startMatch.timestamp;
  const segmentSplits = remainingSplits.slice(0, endMatch.index + 1);
  const avgHr = mean(segmentSplits.map((s) => s.hr).filter(Boolean)) ?? null;

  return { elapsed_time: elapsedTime, avg_hr: avgHr };
}
```

Requires `lat`, `lng`, `timestamp` on each Split in `raw_splits`.

- GPX: timestamp from `<time>` element on each trackpoint
- Strava: timestamp from streams API `time` array
- Manual runs: no GPS → no matching

On match:

- Insert `segment_efforts` row
- Update `segments.best_time` and `segments.best_date` if new PR

**Re-match all runs:** Button in Settings → Segments.
Useful after syncing new starred segments — finds historical efforts
on segments that weren't imported yet when those runs were recorded.

---

## Segments page (/segments)

### Segment list

One row per segment. Default sort: alphabetical.

| Column    | Notes                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Name      | Clickable → detail view                                                  |
| Distance  | km                                                                       |
| Best time | MM:SS — your fastest effort                                              |
| Best date | Date of best effort                                                      |
| Efforts   | Total count of matched efforts                                           |
| Avg time  | MM:SS across all efforts                                                 |
| Trend     | ↗ improving / ↘ declining (last 3 vs first 3 efforts) / — if < 3 efforts |
| KOM gap   | "+1:24 behind" / "—" if no KOM data                                      |
| Badges    | 🔥 last effort within 5% of own PR · 🏆 last effort within 10% of KOM    |

Sortable by: name, best time, efforts, trend.

### Badge logic

```typescript
function getSegmentBadges(
  segment: Segment,
  latestEffort: SegmentEffort | null
) {
  const badges: string[] = [];
  if (!latestEffort || !segment.best_time) return badges;

  const gapToPR =
    (latestEffort.elapsed_time - segment.best_time) / segment.best_time;
  if (gapToPR <= 0.05) badges.push("🔥");

  if (segment.kom_time) {
    const gapToKOM =
      (latestEffort.elapsed_time - segment.kom_time) / segment.kom_time;
    if (gapToKOM <= 0.1) badges.push("🏆");
  }

  return badges;
}
```

### Empty state (Strava connected, no matched efforts yet)

```
Your starred segments are imported.
Run one of your routes to start recording efforts.

[X segments imported from Strava]
[Re-match all runs →]
```

Show the count of imported segments so the user knows the import worked,
even if no efforts have been matched yet.

---

## Segment detail view

### Header

```
[Segment name]
[Distance] · [Avg grade if available] · [Strava segment link →]

Best time: 8:42   KOM: 7:30   Gap: +1:12 (+16%)
```

Strava segment link opens the segment on strava.com in a new tab.

### Effort history chart

Chart.js line chart:

- X-axis: date of each effort (chronological)
- Left Y-axis: elapsed time, inverted (faster = higher), MM:SS format
- Right Y-axis: avg HR (only if HR data available on efforts)
- Dashed reference line: personal best time
- Dashed reference line: KOM time (if available)

### Effort history table

| Date   | Time | vs PR | vs KOM | Avg HR | Run |
| ------ | ---- | ----- | ------ | ------ | --- |
| Jan 14 | 8:42 | PR 🔥 | +1:12  | 162    | →   |
| Dec 20 | 9:14 | +0:32 | +1:44  | 158    | →   |

"Run →" links to `/runs/[id]` for that activity.

### KOM gap panel

Only shown if `kom_time` is set:

```
KOM        7:30
Your best  8:42
Gap        +1:12  (+16%)
```

---

## Segment management

No creation or editing of segment definitions — Strava owns the data.

User actions available:

- **Re-match all runs** — Settings → Segments → "Re-match runs against segments"
- **Hide a segment** — removes it from the list without deleting effort history.
  Useful for segments on routes the user no longer runs.
  Hidden segments can be restored from Settings → Segments → "Manage hidden segments"

Segments cannot be deleted manually — if unstarred on Strava they are
marked `starred: false` and shown with a muted "Unstarred" badge.
Effort history is always preserved.

---

## Strava API compliance

Per the Strava API agreement:

- Segment effort data is only shown to the authenticated user whose
  efforts they are — never shared across users
- KOM time is shown as a reference number (public segment data)
- No leaderboard features — no showing other users' times
- No cross-user comparison
