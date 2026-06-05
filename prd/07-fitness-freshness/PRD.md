# PRD 07 — Fitness & Freshness (ATL, CTL, TSB)

## Overview

Implements the Performance Management Chart (PMC) used in endurance coaching. Models fitness (CTL), fatigue (ATL), and form (TSB) from accumulated training load across all runs. Works for any runner — road, trail, or mixed — regardless of distance or discipline.

---

## Concepts

| Term | Full name               | Definition               | Time constant |
| ---- | ----------------------- | ------------------------ | ------------- |
| TL   | Training Load           | Stress score for one run | per-run       |
| ATL  | Acute Training Load     | Short-term fatigue       | 7-day EWA     |
| CTL  | Chronic Training Load   | Long-term fitness        | 42-day EWA    |
| TSB  | Training Stress Balance | Form = CTL − ATL         | daily         |

---

## Training Load per run

```typescript
// /lib/calculations.ts
export function computeTrainingLoad(run: Run, profile: Profile): number {
  const durationHours = run.moving_time / 3600;

  const hrRatio =
    run.avg_hr && profile.max_hr ? run.avg_hr / profile.max_hr : 0.75; // default if no HR data

  const intensityFactor =
    hrRatio < 0.81
      ? 0.65 // Z2 — aerobic
      : hrRatio < 0.9
        ? 0.85 // Z3 — threshold
        : 1.05; // Z4+ — hard

  return Math.round(durationHours * hrRatio * intensityFactor * 100);
}
```

If no HR data and `ftp_pace` is set, use pace-based intensity:

```typescript
const paceRatio = run.avg_pace > 0 ? profile.ftp_pace! / run.avg_pace : 0.75;
```

---

## ATL / CTL / TSB time series

```typescript
export function computeFitnessTimeSeries(runs: Run[], profile: Profile) {
  const sorted = [...runs].sort((a, b) => a.date.localeCompare(b.date));

  // Build daily load map
  const dailyLoad: Record<string, number> = {};
  for (const run of sorted) {
    dailyLoad[run.date] =
      (dailyLoad[run.date] ?? 0) + computeTrainingLoad(run, profile);
  }

  const start = new Date(sorted[0].date);
  const end = new Date();
  let ctl = 0,
    atl = 0;
  const series: FitnessPoint[] = [];

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const load = dailyLoad[key] ?? 0;

    ctl += (load - ctl) * (1 - Math.exp(-1 / 42));
    atl += (load - atl) * (1 - Math.exp(-1 / 7));

    series.push({
      date: key,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
  }

  return series;
}
```

After computing, update each run's `ctl_at_date`, `atl_at_date`, `tsb_at_date` snapshot in Supabase.

---

## Form labels

| TSB range | Label          | Colour |
| --------- | -------------- | ------ |
| > 15      | Fresh          | Blue   |
| 5 – 15    | Optimal        | Green  |
| −10 – 5   | Neutral        | Gray   |
| −20 – −10 | Fatigued       | Amber  |
| < −20     | Overreaching ⚠ | Red    |

---

## Performance Management Chart

Page: `/fitness`

### Top chart — CTL and ATL

Chart.js line chart:

- Blue line: CTL (fitness)
- Red line: ATL (fatigue)
- X-axis: dates
- Y-axis: arbitrary units
- Default range: last 90 days
- Zoomable via Chart.js zoom plugin

### Bottom chart — TSB

Separate Chart.js bar chart sharing the X-axis:

- Green bars: positive TSB (fresh/optimal)
- Red bars: negative TSB (fatigued)

Synchronised zoom: when user zooms the top chart, TSB chart zooms to match via shared React state.

---

## Fitness page layout

```
[Form indicator card — current TSB + label + explanation]

[Date range: 30d | 90d | 6m | 1y | All]

[CTL / ATL line chart]
[TSB bar chart]

[Insights]
  "Your fitness (CTL) has grown 18% over the last 30 days."
  "Form is good (+12) — well-rested for a quality session or race."
  "Peak CTL this year: 68 on March 14."
```

### Rule-based insights

```typescript
function generateFitnessInsights(
  series: FitnessPoint[],
  profile: Profile
): string[] {
  const insights: string[] = [];
  const today = series[series.length - 1];
  const thirtyDaysAgo = series[series.length - 31];

  if (thirtyDaysAgo) {
    const ctlChange =
      ((today.ctl - thirtyDaysAgo.ctl) / thirtyDaysAgo.ctl) * 100;
    if (ctlChange > 10)
      insights.push(
        `Fitness up ${ctlChange.toFixed(0)}% over 30 days — solid build.`
      );
    else if (ctlChange < -10)
      insights.push(
        `Fitness down ${Math.abs(ctlChange).toFixed(0)}% — training volume has dipped.`
      );
  }

  if (today.tsb > 10)
    insights.push(
      `Form is good (TSB +${today.tsb}) — good time for a quality session.`
    );
  if (today.tsb < -20)
    insights.push(
      `Overreaching territory (TSB ${today.tsb}) — consider easy days.`
    );

  const peakCtl = Math.max(...series.map((p) => p.ctl));
  const peakDate = series.find((p) => p.ctl === peakCtl)?.date;
  if (peakDate)
    insights.push(
      `Peak fitness this period: ${peakCtl.toFixed(1)} on ${formatDate(peakDate)}.`
    );

  return insights.slice(0, 3);
}
```

---

## Minimum data requirement

Fitness chart requires at least 7 days of runs to be meaningful. Before that, show:

> "Keep running — fitness and fatigue tracking fills in after a week of data."

The form indicator card on the dashboard is also hidden until this threshold is met.

---

## Overreaching warning

If TSB < −20 for 3+ consecutive days, show a persistent amber banner on the Fitness page:

> "You've been overreaching for 3 days. Reducing load now helps avoid injury and fatigue accumulation."

Informational only — not a blocker.
