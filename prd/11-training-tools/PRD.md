# PRD 11 — Training Tools

## Overview

Four standalone calculators on the `/tools` page. Accessible without login — a preview for unauthenticated users. Pure client-side, no storage. Useful for any runner regardless of experience or target distance. The race-specific tools (gel timing, pace calculator for race distances) are included but presented as general utilities, not as the headline feature.

---

## Tool 1 — Pace calculator

**Purpose:** Given a target pace, show finish times for standard distances simultaneously.

**UI:**

```
Pace per km
─────────────────────────────────────────
[◀──────────●──────────────────────────▶]
               5:30 /km

Distance          Finish time
5 km              0:27:30
10 km             0:55:00
Half marathon     1:56:03
Marathon          3:52:06
```

Slider range: 4:00 to 10:00 min/km in 5-second steps.

Format: HH:MM:SS for times over 1 hour, MM:SS otherwise.

Live update on every slider move. No submit button.

**Calculation:**

```typescript
const finishSeconds = (paceSecPerKm: number, distanceKm: number) =>
  Math.round(paceSecPerKm * distanceKm);
```

---

## Tool 2 — Gel timing calculator

**Purpose:** Plan nutrition intake during a run based on expected finish time. Useful for races and long training runs.

**Input:** Uses the pace slider from Tool 1 plus a distance selector (5k / 10k / Half / Marathon).

**Schedule:**

| Gel   | Type          | At time | Notes |
| ----- | ------------- | ------- | ----- |
| Gel 1 | No caffeine   | 45 min  | —     |
| Gel 2 | With caffeine | 80 min  | —     |
| Gel 3 | With caffeine | 110 min | —     |

Conditional display based on finish time:

- Finish < 45 min: no gels shown — "Effort too short for gels"
- Finish 45–80 min: Gel 1 only
- Finish 80–110 min: Gel 1 and Gel 2
- Finish 110+ min: all three gels
- Finish 145+ min: optional Gel 4 at 145 min (caffeine) shown as suggestion

km estimate per gel:

```typescript
const gelKm = (triggerMinutes: number, paceSecPerKm: number) =>
  (triggerMinutes * 60) / paceSecPerKm;
```

**Output:**

```
Half marathon at 5:30/km — finish: 1:56:03

Gel 1 (no caffeine)   45:00   km 8.2
Gel 2 (caffeine)    1:20:00   km 14.5
Gel 3 (caffeine)    1:50:00   km 20.0

Tips:
  Take gels 15-20 min before you feel you need them
  Wash down with water, not sports drink
  Practice gel timing in training before race day
```

A simple horizontal timeline SVG shows start, gel markers, and finish.

---

## Tool 3 — Hill gradient calculator

**Purpose:** Classify a hill and understand its training value.

**Inputs:**

- Elevation gain (m)
- Distance (m)

**Outputs:**

```typescript
function classifyHill(elevationM: number, distanceM: number) {
  const gradient = (elevationM / distanceM) * 100;
  const dPlusPerKm = (elevationM / distanceM) * 1000;

  const classification =
    gradient < 5
      ? { label: "Flat", color: "green" }
      : gradient < 10
        ? { label: "Moderate", color: "lime" }
        : gradient < 20
          ? { label: "Demanding", color: "amber" }
          : gradient < 40
            ? { label: "Steep trail", color: "orange" }
            : { label: "Extreme", color: "red" };

  return {
    gradient,
    dPlusPerKm,
    classification,
    suitableForHillRepeats: gradient >= 6 && gradient <= 10,
    suitableForHillSprints: gradient >= 8 && gradient <= 15,
  };
}
```

**UI output:**

```
Gradient:         12.4%
D+/km:            124 m/km
Classification:   Demanding

Training use:
  Hill repeats (6-10%):  No — too steep for sustained repeats
  Hill sprints (8-15%):  Yes — good for explosive 20-30 sec efforts
```

A description is selected from a template based on gradient range:

- Flat: "Minimal elevation — pacing will be consistent throughout."
- Moderate: "Gentle incline. Good for threshold runs and hill repeats."
- Demanding: "Significant climb. Expect a noticeable slowdown. Strength and form work."
- Steep trail: "Technical and steep. Walk-run strategy typical at race pace."
- Extreme: "Very steep terrain. Hands-on-knees territory. Specific trail or vertical km training."

---

## Tool 4 — Zone 2 HR calculator

**Purpose:** Calculate all heart rate training zones from a single 20-minute effort test.

**Input:**

- Average HR during a recent hard 20-minute effort (field test)
- Helper: "Run or cycle as hard as you can sustain for 20 minutes. Use your average HR from that effort."

The 20-min avg HR approximates LTHR (lactate threshold heart rate).

**Zone calculation:**

```typescript
function computeZones(lthr: number) {
  return {
    z1: { min: 0, max: Math.round(lthr * 0.8), label: "Recovery" },
    z2: {
      min: Math.round(lthr * 0.8),
      max: Math.round(lthr * 0.89),
      label: "Aerobic",
    },
    z3: {
      min: Math.round(lthr * 0.89),
      max: Math.round(lthr * 0.93),
      label: "Tempo",
    },
    z4: {
      min: Math.round(lthr * 0.93),
      max: Math.round(lthr * 1.0),
      label: "Threshold",
    },
    z5: { min: Math.round(lthr * 1.0), max: 220, label: "VO2max / Hard" },
  };
}
```

**UI output:**

```
Your LTHR: 168 bpm

Zone   Range        Label          Training use
Z1     0 – 134      Recovery       Easy shakeout
Z2     134 – 149    Aerobic        Long runs, base building  ← highlighted
Z3     150 – 156    Tempo          Comfortably hard
Z4     157 – 168    Threshold      Intervals, race pace
Z5     169+         VO2max / Hard  Short hard efforts

Zone 2 target: 134 – 149 bpm
Keep easy runs below 149 bpm.
```

Z2 row is highlighted as the most important zone for endurance base.

**Save to profile (logged-in users only):**
"Save as my max HR" button — writes estimated max HR to profile:

```typescript
const estimatedMaxHr = Math.round(lthr / 0.95);
```

---

## Tools page layout

```
[Page header: "Training Tools"]

[If not logged in: "Sign in to save your zone settings and personalise predictions"]

[2x2 grid on desktop, stacked on mobile]
  [Pace Calculator]        [Gel Timing]
  [Hill Gradient]          [Zone 2 HR]
```

All four tools visible and independently functional. No submit buttons — all outputs update live on input change.
