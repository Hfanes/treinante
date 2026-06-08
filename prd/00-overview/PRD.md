# PRD 00 — Overview & Architecture

## Vision

A general-purpose running analytics platform for any runner — road, trail, track, or mixed. Users sign up, import their runs via GPX upload or Strava sync, and get a complete picture of their training: per-run metrics, long-term trends, fitness tracking, personal records, and training tools. No assumption about distance, discipline, or experience level.

## Goals

- Import and analyse runs with full split-level detail: pace, HR, elevation, GAP
- Visualise training trends over time: volume, pace, elevation, HR
- Track fitness and fatigue (ATL/CTL/TSB) across all runs
- Automatically surface personal records across all distances
- Predict race times from any recent effort
- Track repeatable route segments and progress toward PRs
- Auto-generate weekly training summaries
- Provide standalone training calculators accessible to any runner

## Who it's for

Any runner who creates an account. The app adapts to the user's data — if they only run roads, elevation features are de-emphasised. If they run trails, D+ and GAP are prominent. No onboarding forces a specific discipline or goal.

## Non-goals (v1)

- Social features (following other users, shared leaderboards)
- Map rendering of GPS routes (coordinates stored but not rendered)
- Coaching plans or structured workouts
- Mobile native app
- Email delivery of reports

---

## Tech stack

| Layer               | Choice                             | Reason                                                                                 |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Framework           | Next.js 16 (App Router) + React 19 | API routes built-in, Vercel-native, server components for fast initial load            |
| Styling             | Tailwind CSS 4                     | Utility-first, CSS-first theme tokens, custom `dark` variant for class-based dark mode |
| Charts              | Chart.js + react-chartjs-2         | Flexible, dual Y-axis, zoom plugin                                                     |
| Auth + DB + Storage | Supabase                           | Free tier: auth, PostgreSQL, file storage, RLS                                         |
| Database workflow   | Supabase CLI migrations            | Versioned SQL source of truth for schema, RLS policies, and auth triggers              |
| Local cache         | IndexedDB via `idb`                | Write-through cache, instant reads, offline after first load                           |
| Hosting             | Vercel                             | Free tier, zero-config Next.js deployment                                              |
| Strava OAuth        | Next.js Route Handlers             | `/src/app/api/strava/callback/route.ts` — hides client_secret                          |
| GPX parsing         | DOMParser (browser built-in)       | No extra dependency, runs client-side                                                  |

---

## Folder structure

```
/
├── /src
│   ├── /app
│   │   ├── /api
│   │   │   └── /strava
│   │   │       ├── /callback/route.ts # OAuth code → token exchange
│   │   │       └── /refresh/route.ts  # Refresh expired tokens
│   │
│   │   ├── /(auth)
│   │   │   ├── /login/page.tsx
│   │   │   └── /signup/page.tsx
│   │
│   │   ├── /(dashboard)               # Protected layout with sidebar
│   │   │   ├── layout.tsx             # Sidebar + auth guard
│   │   │   ├── /dashboard/page.tsx    # Feature 05
│   │   │   ├── /runs/page.tsx         # Run history table
│   │   │   ├── /runs/[id]/page.tsx    # Per-run analysis (Feature 04)
│   │   │   ├── /records/page.tsx      # PRs (Feature 06)
│   │   │   ├── /fitness/page.tsx      # ATL/CTL/TSB (Feature 07)
│   │   │   ├── /predictor/page.tsx    # Race predictor (Feature 08)
│   │   │   ├── /segments/page.tsx     # Segment hunter (Feature 09)
│   │   │   ├── /reports/page.tsx      # Weekly reports (Feature 10)
│   │   │   └── /settings/page.tsx
│   │
│   │   └── /tools/page.tsx            # Public — no auth required
│   │
│   ├── /components
│   │   ├── /charts                    # Chart.js wrappers
│   │   ├── /layout                    # Sidebar, TopBar, PageShell
│   │   ├── /runs                      # RunCard, RunTable, RunDetail
│   │   ├── /tools                     # Calculators
│   │   ├── /segments                  # SegmentTable, SegmentDetail
│   │   └── /ui                        # Button, Card, Badge, Toast, Skeleton
│   │
│   ├── /lib
│   │   ├── supabase.ts                # Supabase client (browser + server)
│   │   ├── supabase-server.ts         # Server component client
│   │   ├── idb.ts                     # IndexedDB schema + helpers
│   │   ├── gpxParser.ts               # GPX XML → normalised Run
│   │   ├── stravaClient.ts            # Strava API fetch wrapper
│   │   ├── calculations.ts            # GAP, ATL/CTL/TSB, Riegel, VO2max
│   │   ├── prExtractor.ts             # PR extraction from splits
│   │   └── reportEngine.ts            # Weekly report generation
│   │
│   ├── /hooks
│   │   ├── useRuns.ts                 # Supabase + IndexedDB sync
│   │   ├── useAuth.ts                 # Supabase Auth wrapper
│   │   ├── useFitness.ts              # ATL/CTL/TSB derived state
│   │   └── useSegments.ts
│   │
│   ├── /types
│   │   └── index.ts                   # Shared TypeScript types
│   │
│   └── proxy.ts                       # Next.js 16 auth redirect for protected routes
│
├── /supabase
│   └── /migrations                    # Versioned database schema, RLS, triggers
│
├── .env.local
└── next.config.mjs
```

---

## Environment variables

| Variable                               | Where set                 | Used in                                    |
| -------------------------------------- | ------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Vercel env + `.env.local` | Browser Supabase client                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel env + `.env.local` | Browser Supabase client                    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Vercel env only           | Server-side token writes in Route Handlers |
| `STRAVA_CLIENT_ID`                     | Vercel env only           | `/src/app/api/strava/callback/route.ts`    |
| `STRAVA_CLIENT_SECRET`                 | Vercel env only           | Never in browser — server only             |

---

## Constraints

- Supabase free tier pauses DB after 1 week of inactivity — handle with retry + loading state
- Supabase free tier: 500MB DB, 1GB file storage, 50k MAU
- Vercel free tier: 100GB bandwidth/month — sufficient for personal/small group use
- GPS coordinate work is client-side only (no map rendering in v1)
- No real-time cross-device sync — syncs on page load
- Database schema changes are versioned as Supabase CLI migrations; avoid SQL Editor-only schema changes
- Strava OAuth tokens are server-only integration credentials stored outside `profiles`; browser clients only see `strava_connected`.

---

## Core data contract

All runs, regardless of source (GPX, Strava, manual), normalise to a single `Run` type before storage:

```typescript
// /src/types/index.ts

export type RunSource = "gpx" | "strava" | "manual";
export type EffortZone = "z2" | "z3" | "z4";

export interface Split {
  km: number;
  pace: number; // sec/km
  hr: number | null;
  elevation: number; // metres at this km mark
  gap: number; // grade adjusted pace, sec/km
  is_stop: boolean; // pace > 540 sec/km
  lat: number | null; // for segment matching
  lng: number | null;
}

export interface Run {
  id: string;
  user_id: string;
  date: string; // ISO 8601 date
  source: RunSource;
  strava_activity_id: number | null;
  distance: number; // km
  total_time: number; // seconds
  moving_time: number; // seconds
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain: number; // metres D+
  elevation_loss: number; // metres D-
  avg_pace: number; // sec/km
  gpx_file_url: string | null;
  raw_splits: Split[];
  training_load: number | null;
  ctl_at_date: number | null;
  atl_at_date: number | null;
  tsb_at_date: number | null;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  weekly_km_goal: number;
  max_hr: number | null;
  resting_hr: number | null;
  ftp_pace: number | null; // sec/km
  strava_connected: boolean;
  onboarding_complete: boolean;
}
```
