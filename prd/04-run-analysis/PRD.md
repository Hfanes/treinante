# PRD 04 — Per-Run Analysis

## Overview

The run detail page (`/runs/[id]`) is the core analysis view. Shows a complete breakdown of a single run: summary metrics, interactive splits chart, GAP, cardiac drift, and effort classification. Adapts to available data — HR and elevation sections are hidden when data is absent.

---

## Summary metric cards

Displayed in a responsive grid. Cards with null data are hidden rather than showing "—" everywhere, keeping the view clean.

**Always shown (data always available):**

| Card        | Value    | Format                                    |
| ----------- | -------- | ----------------------------------------- |
| Distance    | 8.3 km   | 1 decimal                                 |
| Total time  | 42:15    | HH:MM:SS or MM:SS                         |
| Avg pace    | 5:05 /km | MM:SS                                     |
| Moving time | 41:48    | only shown if differs from total by > 30s |

**Shown when HR data present:**

| Card        | Value               |
| ----------- | ------------------- |
| Avg HR      | 152 bpm             |
| Max HR      | 174 bpm             |
| Effort zone | Z2 / Z3 / Z4+ badge |

**Shown when elevation data present:**

| Card  | Value     |
| ----- | --------- |
| D+    | 320 m     |
| D-    | 310 m     |
| D+/km | 38.6 m/km |
| GAP   | 4:52 /km  |

**Shown when fitness data computed:**

| Card       | Value           |
| ---------- | --------------- |
| TSB on day | +8 (form badge) |

---

## Effort zone classification

Based on avg HR as % of user's `max_hr` from profile:

```typescript
function classifyZone(avgHr: number, maxHr: number): EffortZone {
  const pct = avgHr / maxHr;
  if (pct < 0.81) return "z2";
  if (pct < 0.9) return "z3";
  return "z4";
}
```

Fallback (no HR data, but FTP pace set):

```typescript
function classifyZoneByPace(avgPace: number, ftpPace: number): EffortZone {
  if (avgPace > ftpPace + 30) return "z2";
  if (avgPace > ftpPace - 30) return "z3";
  return "z4";
}
```

If neither max_hr nor ftp_pace is set: no zone badge shown.

---

## Grade Adjusted Pace (GAP)

Adjusts pace to flat-equivalent, allowing fair comparison across hilly and flat runs.

```typescript
function computeGAP(
  paceSecPerKm: number,
  elevationDeltaM: number,
  distanceM: number
): number {
  const gradientPct = (elevationDeltaM / distanceM) * 100;
  const clampedGradient = Math.max(-30, Math.min(30, gradientPct));

  const adjustment =
    clampedGradient > 0
      ? clampedGradient * 8 // uphill: costs ~8 sec/km per 1%
      : clampedGradient * 4; // downhill: saves ~4 sec/km per 1%

  return Math.round(paceSecPerKm - adjustment);
}
```

Whole-run GAP = distance-weighted mean of all split GAPs.

Only shown when elevation data is present. For flat runs (elevation_gain < 10m total), GAP is omitted as it adds no information.

---

## Cardiac drift

Compares avg HR in the first half of the run vs the second half.

```typescript
function computeCardiacDrift(splits: Split[]) {
  const withHr = splits.filter((s) => s.hr !== null);
  if (withHr.length < 4) return null; // not enough data

  const mid = Math.floor(withHr.length / 2);
  const firstHalf = withHr.slice(0, mid);
  const secondHalf = withHr.slice(mid);

  const avgFirst = mean(firstHalf.map((s) => s.hr!));
  const avgSecond = mean(secondHalf.map((s) => s.hr!));
  return { drift: avgSecond - avgFirst, avgFirst, avgSecond };
}
```

**Display:**

- Neutral (< 5 bpm): "HR drift: +3 bpm" in gray
- Moderate (5–8 bpm): amber note "Mild cardiac drift"
- High (> 8 bpm): amber warning "Cardiac drift detected (+11 bpm) — consider hydration or pacing"
- Very high (> 15 bpm): red warning

Only shown when HR data is present.

---

## Stop detection

A stop is any split where `is_stop = true` (pace > 540 sec/km).

- In the chart: grey background band behind stop splits
- In summary: "2 stops detected" badge
- If > 20% of splits are stops: "High pace variance — run may include paused time not excluded from splits"

---

## Interactive splits chart

Chart.js combo chart. Only rendered when `raw_splits` is non-empty.

**Datasets (shown conditionally):**

| Dataset   | Axis    | Type        | Shown when             |
| --------- | ------- | ----------- | ---------------------- |
| Pace      | Left Y  | Bar         | Always                 |
| GAP       | Left Y  | Line dashed | elevation data present |
| HR        | Right Y | Line        | HR data present        |
| Elevation | Right Y | Area fill   | elevation data present |

**Left Y-axis (pace):** Inverted — faster at top. Format MM:SS. Auto-range ± 30 sec/km around data.

**Right Y-axis:** HR in bpm. Elevation plotted as filled area at low opacity behind other lines.

**X-axis:** "1", "2", "3" ... km labels.

**Stop highlighting:** Semi-transparent grey rectangle behind stop splits using Chart.js annotation plugin.

**Tooltip on hover:**

```
km 5
Pace:      5:12 /km
GAP:       4:58 /km
HR:        154 bpm
Elevation: 142 m
```

**Interactions:**

- Toggle datasets via legend
- Zoom on desktop (Chart.js zoom plugin)

---

## Per-km splits table

Collapsible section below the chart. Same data as chart in tabular form for precise values.

| km  | Pace | GAP  | HR  | Elevation | Note    |
| --- | ---- | ---- | --- | --------- | ------- |
| 1   | 5:08 | 5:02 | 148 | 124 m     |         |
| 2   | 5:22 | 5:18 | 152 | 138 m     |         |
| 3   | 9:14 | —    | 138 | 140 m     | 🛑 Stop |

Stop rows highlighted with grey background.

---

## Run detail page layout

```
[← Back to runs]

[Date · Distance · Source badge · Zone badge]

[Metric cards grid]

[Cardiac drift line — if HR data]
[Stop warning — if stops detected]

[Splits chart — full width, hidden if no splits]

[Per-km table — collapsible, hidden if no splits]

[No split data message — if manual run]
```

**For manual runs (no splits):** Show summary cards only. Below cards: "Import a GPX file for full split analysis — pace, HR, elevation, and more."

---

## Flat-equivalent summary

When elevation data is present, shown below the chart:

> "Flat-equivalent distance: **7.9 km** at your GAP pace of 4:52 /km — 0.4 km shorter than GPS distance, adjusted for 320 m D+."

Helps compare this run fairly against flat road runs in history.
