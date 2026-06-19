# PRD 06 — Personal Records & Bests

## Overview

Automatically extract and track personal records across all distances and categories. PRs are recalculated after every run import or deletion. Any runner — whether they run 5ks or ultras — sees their relevant bests surface automatically.

---

## PR types

| Key                  | Description             | Unit    | Method                                     |
| -------------------- | ----------------------- | ------- | ------------------------------------------ |
| `400m`               | Fastest 400 m           | seconds | Best rolling split window or pace estimate |
| `half_mile`          | Fastest 1/2 mile        | seconds | Best rolling split window or pace estimate |
| `1k`                 | Fastest 1 km            | seconds | Best rolling split window or pace estimate |
| `1_mile`             | Fastest 1 mile          | seconds | Best rolling split window or pace estimate |
| `2_mile`             | Fastest 2 mile          | seconds | Best rolling split window or pace estimate |
| `5k`                 | Fastest 5 km            | seconds | Best rolling split window or pace estimate |
| `10k`                | Fastest 10 km           | seconds | Best rolling split window or pace estimate |
| `15k`                | Fastest 15 km           | seconds | Best rolling split window or pace estimate |
| `10_mile`            | Fastest 10 mile         | seconds | Best rolling split window or pace estimate |
| `20k`                | Fastest 20 km           | seconds | Best rolling split window or pace estimate |
| `half_marathon`      | Fastest half marathon   | seconds | Best rolling split window or pace estimate |
| `30k`                | Fastest 30 km           | seconds | Best rolling split window or pace estimate |
| `marathon`           | Fastest marathon        | seconds | Best rolling split window or pace estimate |
| `50k`                | Fastest 50 km           | seconds | Best rolling split window or pace estimate |
| `50_mile`            | Fastest 50 mile         | seconds | Best rolling split window or pace estimate |
| `100k`               | Fastest 100 km          | seconds | Best rolling split window or pace estimate |
| `100_mile`           | Fastest 100 mile        | seconds | Best rolling split window or pace estimate |
| `200k`               | Fastest 200 km          | seconds | Best rolling split window or pace estimate |
| `24h`                | Best 24h distance       | km      | Max distance inside 24 hours               |
| `48h`                | Best 48h distance       | km      | Max distance inside 48 hours               |
| `longest_run`        | Longest run by distance | km      | Max `runs.distance`                        |
| `longest_duration`   | Longest run duration    | seconds | Max `runs.moving_time`                     |
| `most_elevation`     | Most D+ in a single run | metres  | Max `runs.elevation_gain`                  |
| `best_d_plus_per_km` | Best elevation density  | m/km    | Max `elevation_gain / distance`            |

**Adaptive display:** PRs for distances the user has never run near are not shown. A fixed-distance PR appears when a run covers at least 95% of that distance. A duration PR appears when a run lasts at least 95% of that duration. Longest run, longest duration, most elevation, and best D+/km are also tracked as PR-style bests.

---

## Extraction algorithm (`/src/lib/prExtractor.ts`)

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

### Estimates from coarse split data

Until PRD 13 adds high-resolution streams, fractional distances such as 400 m
and 1 mile are estimated proportionally from the stored split elapsed seconds.
Manual runs and imports without enough split detail use whole-run average pace
when the run covers at least 95% of the target distance.

### Post-import update

```typescript
export async function extractAndUpdatePRs(
  run: Run,
  userId: string,
  profile: Profile
) {
  const splits = run.raw_splits;
  const candidates = {
    "400m": bestTimeForDistance(splits, 0.4),
    half_mile: bestTimeForDistance(splits, 0.804672),
    "1k": bestTimeForDistance(splits, 1),
    "1_mile": bestTimeForDistance(splits, 1.609344),
    "2_mile": bestTimeForDistance(splits, 3.218688),
    "5k": bestTimeForDistance(splits, 5),
    "10k": bestTimeForDistance(splits, 10),
    "15k": bestTimeForDistance(splits, 15),
    "10_mile": bestTimeForDistance(splits, 16.09344),
    "20k": bestTimeForDistance(splits, 20),
    half_marathon: bestTimeForDistance(splits, 21.0975),
    "30k": bestTimeForDistance(splits, 30),
    marathon: bestTimeForDistance(splits, 42.195),
    "50k": bestTimeForDistance(splits, 50),
    "50_mile": bestTimeForDistance(splits, 80.4672),
    "100k": bestTimeForDistance(splits, 100),
    "100_mile": bestTimeForDistance(splits, 160.9344),
    "200k": bestTimeForDistance(splits, 200),
    "24h": bestDistanceForDuration(run, 24 * 60 * 60),
    "48h": bestDistanceForDuration(run, 48 * 60 * 60),
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
[400 m]     [1 mile]     [5 km]       [Half marathon]  [24h distance]
1:12        5:21         19:22        1:28:32           143.5 km
Jan 14      Nov 3        Nov 3        Oct 12            Dec 2
```

Each card:

- Distance label
- Time formatted as MM:SS or HH:MM:SS
- Date achieved
- Click → opens that run detail

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

## Duration PR section

Below the fixed-distance PR cards:

| Best         | Value    | Run | Date   |
| ------------ | -------- | --- | ------ |
| 24h distance | 143.5 km | [→] | Dec 8  |
| 48h distance | 251.2 km | [→] | Nov 22 |

Duration rows hidden until a run lasts at least 95% of that duration.

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
