# PRD 08 — Race Time Predictor & VO2max

## Overview

Three sections on one page:

1. **Current VO2max** — automatically estimated from run history, shown as a fitness indicator
2. **Predicted race times** — derived from VO2max, fully automatic, no run selection
3. **Manual race calculator** — input any distance + time (or pace), get projections across all standard distances instantly

---

## Section 1 — VO2max Estimate

Computed automatically from the best recent effort in the last 90 days.
No user input required.

### Pace-based method (Jack Daniels VDOT)

Finds the best clean effort ≥ 3 km from the last 90 days using the
rolling window from PRD 06 (PR extraction). Uses that effort as input.

### Automatic best effort selection

Automatic VO2max and automatic race predictions use exactly one anchor effort.

Priority order:

1. Best standard rolling window from runs in the last 90 days.
   - Requires split data.
   - Windows containing stops are excluded.
   - Prefer longer standard windows before shorter windows because they are more predictive.
   - Selection order: clean 21 km window, then clean 10 km window, then clean 5 km window, then clean 3 km window.
   - Within the first available distance bucket, select the fastest clean pace.
2. Fallback to whole-run average pace only when no eligible rolling window exists.
   - This includes manual runs or runs without split data.
3. Never mix rolling-window and whole-run signals.
   - Do not average them.
   - Do not combine them into one estimate.
   - Use one selected anchor effort for pace-based VO2max and automatic predictions.

If the selected anchor comes from a rolling window, display the window distance and source run date.
If it comes from a whole run, display the run distance and date.

```typescript
function vo2maxFromPace(bestTimeSec: number, distanceKm: number): number {
  const distanceM = distanceKm * 1000;
  const durationMin = bestTimeSec / 60;
  const velocity = distanceM / durationMin; // metres per minute

  const percentVO2max =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMin) +
    0.2989558 * Math.exp(-0.1932605 * durationMin);

  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity ** 2;

  return Math.round((vo2 / percentVO2max) * 10) / 10;
}
```

### HR-based method (Uth-Sørensen)

```typescript
function vo2maxFromHR(maxHr: number, restingHr: number): number {
  return Math.round(15 * (maxHr / restingHr) * 10) / 10;
}
```

Requires resting HR from Settings. Max HR source priority:

1. Settings `max_hr` if user-entered.
2. Highest `runs.max_hr` observed across imported runs.
3. Age-based estimate `220 - age` as a last resort once profile age/date-of-birth exists.

The UI must show which max HR source is being used. Hidden if resting HR is missing or no max HR source is available.

### Display

```
[ VO2MAX ]
53.2 ml/kg/min

Pace-based: 52.4   (from 10k · Jan 14)
HR-based:   54.0   (from profile HR data)

Recreational 35–45 · Amateur 50–60 · Elite 70+
Training reference only — not a medical measurement.
```

- Working estimate = average of both methods if within 5 pts of each other
- If they diverge > 5 pts: show both, flag "Check your max HR and resting HR in Settings"
- If HR method unavailable: show pace-based only with "Set HR in Settings for a second estimate"

### VO2max Trend Chart

Line chart — VO2max per month over last 6 months, pace-based only.

- X-axis: monthly buckets
- Y-axis: ml/kg/min, auto-scaled ± 5 around data
- Auto insight below: "Fitness up 2 points over 3 months" / "Holding steady" / "Fitness has dipped"
- Hidden until 3 months of data exist: "Trend appears after 3 months of runs"

---

## Section 2 — Predicted Race Times (Automatic)

Derived from working VO2max using inverse Daniels VDOT.
No run selection. No user input. Updates automatically as new runs come in.

```typescript
function predictTimeFromVO2max(vo2max: number, distanceKm: number): number {
  // Binary search for velocity V where:
  //   vo2AtV / percentVO2maxAtDuration = vo2max
  // Returns predicted time in seconds
}

function predictedPace(vo2max: number, distanceKm: number): number {
  const timeSec = predictTimeFromVO2max(vo2max, distanceKm);
  return timeSec / distanceKm; // sec/km
}
```

### Output table

Displayed as a clean table:

| Distance      | km      | Predicted time | Pace    |
| ------------- | ------- | -------------- | ------- |
| 1 mile        | 1.609   | 5:02           | 3:07/km |
| 5 km          | 5       | 22:15          | 4:27/km |
| 10 km         | 10      | 46:20          | 4:38/km |
| Half marathon | 21.0975 | 1:43:05        | 4:53/km |
| Marathon      | 42.195  | 3:36:42        | 5:08/km |
| 50 km         | 50      | 4:22:00        | 5:14/km |

Columns: Distance label · km · Predicted time · Pace per km

Each row also shows delta vs current PR if one exists:

- Green: prediction is faster than PR ("−1:07 vs PR" — stretch goal)
- Muted gray: prediction is slower than PR (PR may be from peak fitness)

Footer note below table:

```
MODEL · RIEGEL EXPONENT 1.06 · ASSUMES EQUAL FITNESS & FLAT COURSE.
```

---

## Section 3 — Manual Race Calculator

A standalone calculator. No data from run history needed — works even
without any imported runs. Useful for "what if" scenarios.

### UI (matching the image reference)

Left panel — input:

```
[ ANCHOR PERFORMANCE ]
Anchor performance

DISTANCE (KM)
[ 10  ▲▼ ]

TIME
[ 34  ▲▼ ] : [ 51  ▲▼ ]  MIN · SEC

────────────────────────────
PACE          VDOT (EST.)
3:29/km       34
```

Right panel — output:

```
[ PROJECTED TIMES ]
Across every standard distance

1 mile        1.609 km      5:02      3:07/km
5 km          5 km          16:43     3:21/km
10 km         10 km         34:51     3:29/km
Half          21.0975 km    1:16:54   3:39/km
Marathon      42.195 km     2:40:19   3:48/km
50 km         50 km         3:11:55   3:50/km

MODEL · RIEGEL EXPONENT 1.06 · ASSUMES EQUAL FITNESS & FLAT COURSE.
```

### Input modes (toggle)

Two modes switchable via a pill toggle above the inputs:

**Mode A — Distance + Time :**

- Distance: number input with up/down arrows, in km
- Time: MIN + SEC inputs with up/down arrows
- Outputs: pace per km, VDOT estimate, full projection table

**Mode B — Distance + Pace:**

- Distance: same as above
- Pace: MIN/km input (e.g. 4:30)
- Outputs: finish time, VDOT estimate, full projection table

All projections use Riegel formula:

```typescript
function riegelProject(t1Sec: number, d1Km: number, d2Km: number): number {
  return t1Sec * Math.pow(d2Km / d1Km, 1.06);
}
```

VDOT estimate uses `vo2maxFromPace(t1Sec, d1Km)`.

Live update — recalculates on every keystroke. No submit button.

### Pre-fill from best recent run

If the user is logged in and has runs, pre-fill the calculator with their
best recent effort (same effort used for Section 2 predictions).
They can override freely — the calculator is independent.

---

## Page layout

```
[ PAGE HEADER: "Race Predictor" ]

[ Section 1 — VO2max ]
  VO2max panel (pace + HR methods side by side)
  VO2max trend chart (full width)

[ Section 2 — Predicted Race Times ]
  Automatic projection table (from VO2max)
  PR delta column

[ Section 3 — Manual Calculator ]
  Left: anchor input panel
  Right: projected times table
```

Desktop: sections stack vertically, full width.
Section 3 splits into 2-column (input left, output right) on desktop ≥ 1024px.

---

## Reliability flags

Shown in Section 2 as amber callout. Does not block output:

| Condition                 | Message                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| No runs at all            | "Import at least one run for automatic predictions"                                 |
| Only manual runs          | "GPS data needed for automatic predictions — Section 3 calculator works without it" |
| Best effort < 3 km        | "Short efforts give rough estimates — a 5k+ effort improves accuracy"               |
| Best effort > 90 days old | "No recent runs — predictions based on data older than 90 days"                     |
| Methods diverge > 5 pts   | "Pace and HR estimates differ — check max HR and resting HR in Settings"            |

Section 3 (manual calculator) always works — no flags, no data dependency.

---

## Empty states

| Section          | Situation        | Shown                                      |
| ---------------- | ---------------- | ------------------------------------------ |
| VO2max           | No runs          | "Import runs to see your VO2max estimate"  |
| VO2max trend     | < 3 months data  | "Trend appears after 3 months of runs"     |
| VO2max HR method | No HR in profile | "Set max HR + resting HR in Settings" link |
| Predictions      | No runs          | "Import runs for automatic predictions"    |
| Calculator       | Any state        | Always functional — no empty state         |
