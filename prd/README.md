# Treinante — PRD Index

A general-purpose running analytics platform. Any runner — road, trail, track, or mixed — can sign up, import their runs, and get a complete picture of their training: metrics, progress, fitness trends, and tools.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + Chart.js
- **Auth + DB + Storage:** Supabase (free tier)
- **Database workflow:** Supabase CLI migrations + generated TypeScript types, no ORM in v1
- **Hosting:** Vercel (free tier, same team as Next.js)
- **Local cache:** IndexedDB via `idb`
- **Strava OAuth:** Next.js Route Handlers (`/src/app/api/`)

---

## Document map

| #   | Folder                                             | What it covers                                                 |
| --- | -------------------------------------------------- | -------------------------------------------------------------- |
| 00  | [overview](./00-overview/PRD.md)                   | Vision, goals, constraints, tech stack, folder structure       |
| 01  | [auth](./01-auth/PRD.md)                           | Supabase Auth, user profiles, onboarding, protected routes     |
| 02  | [data-layer](./02-data-layer/PRD.md)               | Supabase schema, IndexedDB cache, sync strategy, export/import |
| 03  | [run-import](./03-run-import/PRD.md)               | GPX parser, Strava OAuth + API, manual entry, normalisation    |
| 04  | [run-analysis](./04-run-analysis/PRD.md)           | Per-run view, splits chart, GAP, cardiac drift, stop detection |
| 05  | [dashboard](./05-dashboard/PRD.md)                 | Unified activity dashboard, trend charts, weekly summaries     |
| 06  | [personal-records](./06-personal-records/PRD.md)   | PR extraction, PR table, PR timeline chart                     |
| 07  | [fitness-freshness](./07-fitness-freshness/PRD.md) | ATL, CTL, TSB calculations, performance management chart       |
| 08  | [race-predictor](./08-race-predictor/PRD.md)       | Riegel formula, VO2max estimate, prediction cards              |
| 09  | [segments](./09-segments/PRD.md)                   | Segment definition, auto-matching, leaderboard, KOM gap        |
| 10  | [weekly-report](./10-weekly-report/PRD.md)         | Auto weekly report, insights engine, report history            |
| 11  | [training-tools](./11-training-tools/PRD.md)       | Pace calc, gel timing, hill gradient, Zone 2 HR calculator     |
| 12  | [ui-ux](./12-ui-ux/PRD.md)                         | Layout, sidebar, dark mode, mobile, loading states, toasts     |
| 13  | [run-streams](./13-run-streams/PRD.md)             | High-resolution per-run streams for detailed charts            |
| 14  | [strava-auto-sync](./14-strava-auto-sync/PRD.md)   | App-wide Strava polling and new-run toast notifications        |
| 15  | [security](./15-security/PRD.md)                   | Session, OAuth, rate-limit, and validation hardening           |
| 16  | [strava-login](./16-strava-login/PRD.md)           | Strava login, token ownership, and OAuth-aware settings        |

---

## Suggested build order

1. `01-auth` — login wall first, everything depends on user id
2. `02-data-layer` — schema + cache before any feature writes data
3. `03-run-import` — GPX upload is the fastest path to real data
4. `04-run-analysis` — per-run detail view, the core loop
5. `05-dashboard` — aggregated charts once multiple runs exist
6. `06-personal-records` — auto-triggered on each run import
7. `11-training-tools` — pure calculation, no data dependency
8. `07-fitness-freshness` — needs run history to be meaningful
9. `08-race-predictor` — needs run history
10. `09-segments` — needs GPS tracks
11. `10-weekly-report` — needs everything above
12. `12-ui-ux` — dark mode and mobile wired throughout, polish last
13. `13-run-streams` — detailed per-run chart data after import/UI foundations
14. `14-strava-auto-sync` — automatic Strava refresh after import foundations
15. `15-security` — hardening pass for sessions, OAuth, rate limits, and validation
16. `16-strava-login` — add Strava as an auth method after OAuth security hardening
