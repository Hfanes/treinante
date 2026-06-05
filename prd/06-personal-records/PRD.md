# PRD 06 — Personal Records & Bests

## Overview

Automatically extract and track personal records across all distances and categories. PRs are recalculated after every run import or deletion. Any runner — whether they run 5ks or ultras — sees their relevant bests surface automatically.

---

## PR types

| Key                  | Description             | Unit    | Method                                       |
| -------------------- | ----------------------- | ------- | -------------------------------------------- |
| `1k`                 | Fastest 1 km            | seconds | Best single split                            |
| `5k`                 | Fastest 5 km            | seconds | Best rolling 5-split window                  |
| `10k`                | Fastest 10 km           | seconds | Best rolling 10-split window                 |
| `21k`                | Fastest half marathon   | seconds | Best rolling 21-split window or interpolated |
| `42k`                | Fastest marathon        | seconds | Best rolling 42-split window or interpolated |
| `longest_run`        | Longest run by distance | km      | Max `runs.distance`                          |
| `most_elevation`     | Most D+ in a single run | metres  | Max `runs.elevation_gain`                    |
| `best_d_plus_per_km` | Best elevation density  | m/km    | Max `elevation_gain / distance`              |

**Adaptive display:** PRs for distances the user has never run near are not shown. A `21k` PR only appears once the user has at least one run ≥ 15 km. A `42k` PR only appears after a run ≥ 35 km. `most_elevation` and `best_d_plus_per_km` are only shown if at least one run has elevation data > 0.

---

## Extraction algorithm (`/lib/prExtractor.ts`)

### Rolling window for time PRs

```typescript
function bestTimeForDistance(splits: Split[], targetKm: number): number | null {
  if (splits.length < targetKm) return null;

  let best = Infinity;

  for (let i = 0; i <= splits.length - targetKm; i++) {
    const window = splits.slice(i, i + targetKm);
    const hasStop = window.some((s) => s.is_stop);
    if (hasStop) continue; // exclude windows containing stops

    const totalTime = window.reduce((sum, s) => sum + s.pace, 0); // sec/km × 1km = sec per split
    if (totalTime < best) best = totalTime;
  }

  return best === Infinity ? null : best;
}
```

### Interpolation for distances longer than the run

If the user's best run is 18 km and we want a 21k estimate, use Riegel interpolation:

```typescript
// T2 = T1 × (D2 / D1) ^ 1.06
function interpolatePR(
  knownTime: number,
  knownDist: number,
  targetDist: number
): number {
  return knownTime * Math.pow(targetDist / knownDist, 1.06);
}
```

Interpolated PRs are marked with `~` prefix: "~1:32:10" and a tooltip: "Estimated from your 18 km run — run a longer distance for an actual time."

### Post-import update

```typescript
export async function extractAndUpdatePRs(
  run: Run,
  userId: string,
  profile: Profile
) {
  if (!run.raw_splits?.length) {
    // Manual run — only check longest_run and most_elevation
    await checkDistancePRs(run, userId);
    return;
  }

  const splits = run.raw_splits;
  const candidates = {
    "1k": bestTimeForDistance(splits, 1),
    "5k": bestTimeForDistance(splits, 5),
    "10k": bestTimeForDistance(splits, 10),
    "21k": bestTimeForDistance(splits, 21),
    "42k": bestTimeForDistance(splits, 42),
    longest_run: run.distance,
    most_elevation: run.elevation_gain,
    best_d_plus_per_km:
      run.distance > 0 ? run.elevation_gain / run.distance : 0,
  };

  for (const [type, value] of Object.entries(candidates)) {
    if (value == null || value === 0) continue;
    const existing = await getPR(userId, type);
    if (!existing || isImprovement(type, value, existing.value)) {
      await upsertPR({
        user_id: userId,
        type,
        value,
        run_id: run.id,
        achieved_at: run.date,
      });
    }
  }
}
```

---

## Records page (`/records`)

### PR cards

A responsive grid of cards showing each applicable PR:

```
[1 km]      [5 km]       [10 km]      [Half marathon]  [Marathon]
3:45        19:22        40:14        1:28:32           ~3:05:00 est.
Jan 14      Nov 3        Nov 3        Oct 12            — (interpolated)
```

Each card:

- Distance label
- Time formatted as MM:SS or HH:MM:SS
- Date achieved
- "~" prefix and muted style for interpolated values
- Click → opens that run detail (or tooltip for interpolated)

Cards for distances never reached are hidden entirely.

---

## PR timeline chart

Chart.js line/scatter chart showing progression over time for a selected distance.

**Controls:** Tab row — 1k / 5k / 10k / Half / Marathon (only tabs with at least 1 actual PR shown)

**X-axis:** Date of each PR improvement
**Y-axis:** Time in seconds, inverted (faster = higher), formatted MM:SS

**Datasets:**

- Dots: each PR point
- Line connecting dots: progression trend

**Tooltip:** "5k PR — 19:22 on Jan 14 · improved by 0:28"

If only one PR for a distance: show the dot with message "Run more to see progression."

---

## Distance bests section

Below the time PR cards:

| Best           | Value      | Run | Date   |
| -------------- | ---------- | --- | ------ |
| Longest run    | 28.4 km    | [→] | Dec 8  |
| Most elevation | 1,840 m D+ | [→] | Nov 22 |
| Best D+/km     | 84 m/km    | [→] | Nov 22 |

Elevation rows hidden if no elevation data in history.

---

## New PR toast

On import, if a PR is set:

```
🏆 New 5k PR — 19:22 (improved by 0:28)
```

Multiple PRs in one import:

```
🏆 New PRs — 5k: 19:22 · 10k: 40:14
```
