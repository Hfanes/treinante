# PRD 14 — Strava Auto-Sync & Toast Notifications

## Goal

Automatically import new Strava runs while an authenticated user is actively using Treinante, then notify the user when new runs arrive.

## Problem

Strava sync currently requires a manual action from Runs or Settings. After a user finishes a run and opens the app, Treinante should fetch new Strava activities without making the user hunt for a Sync button.

## Scope

- Add app-wide client-side Strava auto-sync for connected users.
- Poll only while the app tab is visible and online.
- Sync once when the app becomes visible again.
- Sync once when the browser comes back online.
- Notify users with a toast when new Strava runs are imported.
- Refresh current route data after new imports so dashboards and run lists can update without a full browser reload.

## Non-Goals

- Strava webhooks.
- Vercel Cron background sync.
- Offline write queue.
- Advanced Strava retry/rate-limit handling beyond existing endpoint behavior.
- Syncing when no user has the app open.

## UX

- No toast when zero runs are imported.
- Toast copy for one run: `Imported 1 new Strava run.`
- Toast copy for many runs: `Imported N new Strava runs.`
- Toast should use Treinante dark visual tokens.
- Manual sync buttons remain available.

## Technical Plan

- Install `react-toastify`.
- Add a client toast provider mounted in the root layout.
- Add a protected-shell client component that receives `stravaConnected` from the server layout.
- The component calls `POST /api/strava/sync` every 15 minutes when visible and online.
- It dispatches a browser event after successful imports.
- It calls `router.refresh()` after imports so server-rendered pages refresh.
- `useRuns()` listens for that browser event and calls `syncRuns()` so `/runs` updates its client cache/state.

## Acceptance Criteria

- Connected users get an automatic Strava sync on protected app pages.
- Disconnected users do not call `/api/strava/sync` automatically.
- Background tabs do not poll Strava.
- New imports show a styled toast.
- `/runs` updates client-side after auto-sync imports runs.
- Dashboard and other protected pages refresh route data after new imports.
- `pnpm lint` and `pnpm build` pass.
