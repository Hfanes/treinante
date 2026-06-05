# PRD 10 — Auto Weekly Training Report

## Overview

Every Monday, automatically generate a structured summary of the previous week. Covers volume, trends vs last week, fitness state, and a short written insight. Works for any runner — the insight engine adapts based on available data (HR, elevation, weekly goal).

---

## Trigger logic

Check on every app open. Generate if: today is Monday or later in the week, a report for the previous week does not yet exist, and at least one run occurred that week.

Also manually triggerable from the Reports page via "Generate last week's report" button.

---

## Report fields

| Field                           | Notes                                             |
| ------------------------------- | ------------------------------------------------- |
| `total_km`                      | Sum of all run distances                          |
| `total_d_plus`                  | Sum of elevation gain — null if no elevation data |
| `total_time`                    | Sum of moving time                                |
| `num_runs`                      | Count of runs                                     |
| `avg_pace`                      | total_time / total_km                             |
| `avg_hr`                        | Mean avg_hr across runs — null if no HR data      |
| `vs_prev_km_delta`              | km delta vs same calculation for previous week    |
| `vs_prev_d_plus_delta`          | D+ delta                                          |
| `vs_prev_time_delta`            | Time delta                                        |
| `ctl_end`, `atl_end`, `tsb_end` | From last run of week's stored snapshot           |
| `zone_breakdown`                | { z2, z3, z4 } percentages — null if no HR data   |
| `insight_text`                  | Rule-based 2-3 sentence summary                   |

---

## Insight engine

Rule-based, no external API. Evaluates conditions and composes sentences from templates. Adapts to available data — HR and fatigue sentences are only included when that data exists.

Sentence categories (up to 3 selected):

1. Volume summary — always included
2. Weekly goal progress — only if goal is set in profile
3. Fatigue / form note — only if CTL/ATL/TSB data available
4. Zone balance note — only if HR data available

---

## Reports page (/reports)

Collapsed card per week:

```
Week of Jan 6 - Jan 12   42.1 km   4 runs   TSB +8
```

Expanded card shows all report fields. Sections that have no data are hidden rather than shown as zero or dashes.

Delta indicators: green arrow up if positive, red arrow down if negative, gray right arrow if less than 5% change.

Zone breakdown shown as a horizontal bar divided into green (Z2), amber (Z3), red (Z4+) segments.

---

## Empty state

"Reports are generated automatically every Monday after your first full week of running. Come back then to see your summary."
