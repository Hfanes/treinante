# PRD 08 — Race Time Predictor

## Overview

Predicts finish times for standard race distances from any recent run effort using the Riegel formula. Available as a dedicated page and also embedded in the Training Tools section. Works for any runner regardless of their primary distance — a 5k runner can predict their 10k, a marathon runner can check their 5k equivalent.

---

## Riegel formula

```
T2 = T1 × (D2 / D1) ^ 1.06
```

- `T1` = known time for distance `D1`
- `D2` = target distance
- `T2` = predicted time

The exponent `1.06` is the standard fatigue factor — it slightly penalises longer distances.

---

## Input: effort selection

Dropdown showing recent runs and PRs as base efforts:

```
Recent efforts (last 90 days)              Your PRs
─────────────────────────────              ──────────────────────
Jan 14 · 12.4 km · 1:04:32 (5:12/km)      5k  · 19:22  (Nov 2024)
Jan 10 · 8.0 km  · 0:42:15 (5:17/km)      10k · 40:14  (Nov 2024)
Jan 6  · 21.1 km · 1:52:40 (5:20/km)      21k · 1:28:32 (Oct 2024)
```

**Auto-select:** Pre-selects the run from the last 90 days with the fastest GAP pace and distance ≥ 3 km.

**Reference distance:** Auto-detected from the selected run's GPS distance. User can override.

---

## Prediction output

Four cards shown simultaneously regardless of user's target distance:

| Distance           | Predicted time | Pace    |
| ------------------ | -------------- | ------- |
| 5 km               | 19:08          | 3:50/km |
| 10 km              | 39:56          | 3:60/km |
| Half (21.1 km)     | 1:27:44        | 4:09/km |
| Marathon (42.2 km) | 3:05:12        | 4:22/km |

Each card shows the gap to current PR for that distance (if one exists):

- "−0:14 vs your 5k PR" (green — would be a PR)
- "+1:28 vs your 10k PR" (gray — not a PR)

No card is highlighted as "target" — the user's target race is not assumed.

---

## VO2max estimate

Two methods shown as context — framed as a reference number, not a goal:

**HR-based (Uth-Sørensen):**

```
VO2max ≈ 15 × (max_hr / resting_hr)
```

Requires both max_hr and resting_hr from profile.

**Pace-based (Daniels approximation):**

```
Derived from best 5k or 10k time
```

```
VO2max estimate
───────────────
HR-based:   52 ml/kg/min
Pace-based: 54 ml/kg/min

Reference: recreational 35–45, amateur competitive 50–60, elite 70+
This is an estimate for training context only, not a medical measurement.
```

Hidden if insufficient data (no HR or no PR at 5k/10k).

---

## Reliability flags

Shown as an amber callout if applicable:

- Effort > 90 days old → "Effort is older than 90 days — may not reflect current fitness"
- Effort < 3 km → "Short effort — predictions for longer distances are estimates only"
- Run contains stops → "Run included stops — consider using a cleaner effort"
- No max_hr set → "Set max HR in Settings for pace-based zone accuracy"

---

## Trend comparison

```
Today's prediction (Jan 14 effort):   Half marathon 1:27:44
4 weeks ago (Dec 20 effort):          Half marathon 1:29:12
Change:                               −1:28 🟢 improving
```

Only shown if an eligible effort exists from 4–8 weeks ago. Hidden otherwise.

---

## Predictor page layout

```
[Page header: "Race Time Predictor"]

[Effort selector]
[Reference distance — auto-detected, editable]

[Reliability flags — if any]

[4 prediction cards: 5k · 10k · 21.1k · 42.2k]

[VO2max estimate — if data available]

[Trend comparison — if prior effort available]
```

---

## Edge cases

- No runs yet → "Import at least one run to generate predictions"
- Only manual runs → use `avg_pace × distance` as T1. Flag: "Manual run — no GPS distance, using entered distance"
- Best effort is a marathon → predictions for shorter distances will be conservative (Riegel is calibrated for upward extrapolation). Show note.
- All runs are very short (< 3 km) → predictions shown but flagged as rough estimates
