# PRD 05 — Unified Activity Dashboard

## Overview

The home page after login. A complete at-a-glance view of the user's running — recent activity, volume trends, pace and HR over time, and current fitness state. Adapts to the user's data: elevation charts only appear if the user has recorded elevation; HR charts only if HR data exists.

---

## Top summary strip

Five cards across the top of the page:

| Card           | Value               | Notes                                                          |
| -------------- | ------------------- | -------------------------------------------------------------- |
| This week      | 28 km of 30 km goal | Progress bar, coloured by % of goal vs day of week             |
| Last 30 days   | 112 km              | Total distance                                                 |
| Total runs     | 248                 | All time                                                       |
| Current form   | +8 · Optimal        | TSB badge, links to Fitness page — hidden if < 2 weeks of data |
| Longest streak | 6 days              | Current or best recent consecutive run days                    |

Weekly goal progress bar colouring:

- Green: on pace or ahead for the week
- Amber: > 20% behind for the day of week
- Red: > 40% behind

---

## Chart 1 — Weekly volume

**Type:** Bar chart (Chart.js)
**X-axis:** Last 12 weeks
**Y-axis:** km

Bars coloured by zone breakdown (stacked):

- Green = Z2 km, Amber = Z3 km, Red = Z4+ km
- Falls back to a single solid colour if no HR data to classify zones

Reference line: dashed horizontal at `weekly_km_goal`.

Tooltip on hover: "Week of Jan 6 — 42 km · 4 runs · 1,240 m D+"

Click a bar → filters `/runs` to that week.

**Adaptive:** If none of the user's runs have elevation data, D+ is omitted from tooltips. If no HR data, the stacked zone colours are replaced with a single brand colour.

---

## Chart 2 — Elevation per week

**Type:** Bar chart, same X-axis as Chart 1
**Y-axis:** metres D+

Only rendered if the user has at least 3 runs with elevation data > 0. Otherwise this chart slot is replaced with a "Connect elevation data" nudge or left empty.

Toggle between Chart 1 and Chart 2 via tabs above the chart (km / D+).

---

## Chart 3 — Pace trend

**Type:** Line chart
**X-axis:** Individual runs, last 60 days
**Y-axis:** Inverted — faster pace at top. Format MM:SS/km.

Datasets:

- Thin line: actual avg pace per run
- Dashed line: GAP per run (only shown if elevation data exists)
- Thick line: 7-run rolling average

Tooltip: "Jan 14 — 5:12 /km · GAP 4:58 /km · 12.4 km"

Purpose: shows whether pace is improving over time and how much elevation affects it.

---

## Chart 4 — HR trend

**Type:** Line chart
**X-axis:** Individual runs, last 60 days
**Y-axis:** bpm

Dataset: 7-run rolling avg HR.

Reference lines (shown if max_hr is set in profile):

- Z2 ceiling: 81% of max_hr
- Z3 ceiling: 90% of max_hr

Only rendered if at least 5 runs have HR data. Otherwise hidden entirely — no empty chart.

---

## Chart 5 — Fitness preview (CTL/ATL)

Compact version of the full Performance Management Chart (PRD 07).

**Type:** Dual-line chart
**Datasets:** CTL (blue) and ATL (red), last 42 days
**No TSB bar** in this compact view — link below: "View full fitness chart →"

Only shown after 14+ days of runs. Before that: "Keep running — fitness tracking fills in after 2 weeks."

---

## Recent runs list

Last 5 runs as compact rows:

```
Jan 14  12.4 km  5:12/km  320m D+  Z2  GPX
Jan 12   8.0 km  5:22/km       —   Z3  Strava
Jan 10  21.1 km  5:08/km  180m D+  Z2  GPX
```

Elevation column hidden if no elevation data. Zone badge hidden if no HR and no FTP pace set.

"View all runs →" link to `/runs`.

---

## Quick actions

Persistent button or FAB (floating action button on mobile):

- Import GPX
- Sync Strava (if connected; shows last sync time)
- Add manual run

---

## Adaptive empty states

**No runs at all:**

```
Welcome, [name]!

Start by importing your runs.

[Import GPX]  [Connect Strava]  [Add manually]
```

**1–3 runs (not enough for trends):**
Charts replaced with: "Add more runs to see trends — charts appear after a few runs."
Recent runs list shows all existing runs.

**Runs exist but no HR data:**
HR chart slot shows: "Connect a heart rate monitor or import from Strava to see HR trends."

---

## Data sourcing

All dashboard data reads from IndexedDB cache — no Supabase calls on render after initial sync. For the first render (server component), initial run data is passed as props from the server (see PRD 02 — server component fetch).

```typescript
// Computed in useDashboard hook
const weeklyBuckets = groupRunsByWeek(runs, 12);
const recentRuns = runs.slice(0, 5);
const paceHistory = last60DaysRuns.map((r) => ({
  date: r.date,
  pace: r.avg_pace,
  gap: r.avg_gap,
}));
const hrHistory = runsWithHR.map((r) => ({ date: r.date, hr: r.avg_hr }));
const currentWeekStats = computeWeekStats(runs, startOfCurrentWeek());
```

---

## Responsiveness

**Mobile (< 768px):**

- Summary cards: 2×3 grid
- Charts stack vertically
- Charts 3 and 4 collapsed behind "Show more" toggle

**Desktop (≥ 1024px):**

- Charts 1 and 3 side by side
- Charts 4 and 5 side by side
