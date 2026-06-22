# PRD Implementation Gaps

Track anything intentionally deferred, partially implemented, or not implemented when a PRD build is concluded. Review this file before starting or concluding each PRD.

## Process

- When finishing a PRD, compare the implementation against that PRD line by line.
- Mark implemented items as done only when verified in code, tests, or build output.
- Add every missing or partial item here, including items deferred because another PRD owns them.
- When a future PRD completes one of these items, update the entry with the resolving PRD and date.

## PRD 01 — Authentication & User Profiles

Reviewed: 2026-06-07

### Deferred To Future PRDs

- Settings Strava connect/disconnect is implemented in PRD 03.

### Intentional Product Choices

- Sidebar no longer displays profile `name` by product choice; it now shows "Powered by" with the Strava logo.

### External Setup Required

- Google OAuth live verification requires Supabase provider setup and valid redirect URLs in Supabase Dashboard.

## PRD 02 — Data Layer: Supabase Schema, IndexedDB Cache, Sync & Export

Reviewed: 2026-06-07

### Deferred To Future PRDs

- JSON import post-processing re-runs personal records, fitness snapshots, and weekly reports. Segment recalculation remains deferred to PRD 09. Weekly reports resolved in PRD 10 on 2026-06-09.

### Not Implemented Yet

- IndexedDB currently stores full `Run` objects in one `runs` store, including split arrays and raw source metadata. Before PRD 09 segment matching or detailed route storage, consider splitting cache storage into lightweight indexed `runs` rows and lazy `run_details` rows for splits/raw payloads.

## PRD 03 — Run Import: GPX, Strava OAuth, Manual Entry

Reviewed: 2026-06-09

### Deferred To Future PRDs

- Post-import pipeline recalculates personal records, fitness snapshots, and weekly reports after import/delete. Segment recalculation remains deferred to PRD 09. Weekly reports resolved in PRD 10 on 2026-06-09.

### Partial Implementations

- Strava imports store computed per-km split points, not the full GPS point stream. PRD 04 does not require full route storage, but PRD 09 segment matching may need a `run_points` table or compressed route storage if per-km split points are too coarse.

## PRD 04 — Per-Run Analysis

Reviewed: 2026-06-09

### Deferred To Future PRDs

- Run import/delete triggers personal record, fitness, and weekly report recalculation. Segment recalculation remains deferred to PRD 09. Weekly reports resolved in PRD 10 on 2026-06-09.

## PRD 05 — Unified Activity Dashboard

Reviewed: 2026-06-09

### Implemented

- Fitness preview displays PRD 07 `ctl_at_date`/`atl_at_date` snapshots when present.

## PRD 06 — Personal Records & Bests

Reviewed: 2026-06-09

### Implemented

- PR success toasts, PR history events, PR timeline chart, and dedicated estimated-record metadata were added on 2026-06-21.

## PRD 07 — Fitness & Freshness

Reviewed: 2026-06-09

### Implemented

- Fitness chart zoom sync/reset and stale snapshot refresh were added on 2026-06-21.

## PRD 08 — Race Time Predictor

Reviewed: 2026-06-09

### Resolved In Future PRDs

- Race-related training tools were added to `/tools` in PRD 11 on 2026-06-15. The full automatic race predictor remains on `/predictor` rather than being duplicated in the public tools page.

### Implemented

- Automatic VO2max uses one anchor effort by priority: best clean rolling window from the last 90 days, then whole-run average pace fallback. Rolling-window candidates now support partial-kilometer split windows using existing split data.

## PRD 10 — Auto Weekly Training Report

Reviewed: 2026-06-09

### Implemented

- Weekly reports are generated from stored runs, profile goal, fitness snapshots, HR zones, and previous-week deltas.
- Previous-week report generation runs from the protected dashboard layout on app open, and can also be manually triggered from `/reports`.
- Run add/delete, JSON import, and Strava sync now recalculate weekly reports.

## PRD 11 — Training Tools

Reviewed: 2026-06-15

### Implemented

- `/tools` is public and includes the pace calculator, gel timing calculator, hill gradient calculator, and Zone 2 HR calculator.
- Tools update client-side without submit buttons, except the logged-in-only Zone 2 action that saves the estimated max HR to the user's profile.

### Intentional Product Choices

- The full automatic race predictor remains on protected `/predictor`; `/tools` provides public race-pace utilities and fueling guidance instead of duplicating personalized predictor data.

## PRD 12 — UI/UX: Layout, Design System, Dark Mode, Mobile

Reviewed: 2026-06-15

### Implemented

- Dark-first instrument-grade token foundation is implemented in `src/app/globals.css` with olive-brown surfaces, sand primary accents, Space Mono metric/label rules, vertical-bar texture utilities, skeleton shimmer, and staggered metric-card entrance animation.
- Google fonts are loaded through `next/font/google` for Inter, Cormorant Garamond, and Space Mono, with the root document permanently dark-first.
- Shared UI primitives (`Card`, `Button`, `Badge`, `Skeleton`) now use the PRD 12 tokens, 2px radius, no shadows, mono metric labels, and data-only badge colors.
- Protected app shell now uses a fixed 240px desktop sidebar, bottom mobile nav, PRD 12 page hero layout, a Strava-powered footer, and dark olive-brown surfaces.
- Dashboard, run import/list, training tools, auth, onboarding, settings form, and Chart.js-based charts were restyled toward the PRD 12 visual system without changing feature behavior.
- Chart.js defaults now use dark tooltip styling, Space Mono labels, sand/semantic series colors, square bars, and `easeOutQuart` 600ms animation on updated dashboard, fitness, and run-split charts.
- Sidebar Fitness/Records badges, tablet compact default, chart accessibility summaries, global toast helpers, PR toast variant, Supabase cold-start toast, and first-visit section callouts were added on 2026-06-21.

### Partial Implementations

- Some feature pages still contain legacy Tailwind gray/brand utility classes. A temporary global legacy utility bridge maps the visible old gray/brand classes onto PRD 12 tokens, but future UI work should continue replacing those with semantic component classes.

## PRD 14 — Strava Auto-Sync & Toast Notifications

Reviewed: 2026-06-21

### Implemented

- Connected users auto-sync Strava on protected app pages while the app tab is visible and online.
- New Strava imports show a styled toast and refresh current route data without a full browser reload.
- `/runs` listens for Strava sync completion and refreshes its local run cache/state.

### Intentional Product Choices

- Auto-sync uses browser polling while the app is open, not Strava webhooks or Vercel Cron.

## PRD 15 — Security Hardening

Reviewed: 2026-06-22

### Implemented

- Supabase sessions remain cookie-backed through `@supabase/ssr`; no auth session storage was found in `localStorage` or `sessionStorage`.
- Server-side route protection remains in `src/proxy.ts`, and service-role Supabase access is kept server-only through `src/lib/supabase-admin.ts`.
- Strava OAuth now starts from a server route, stores a short-lived `HttpOnly` state cookie, and validates that state in the callback before token exchange.
- Strava sync, refresh, delete, disconnect, and manual weekly report generation now use DB-backed per-user rate limits.
- User-writable profile, run, segment, record, report, and rate-limit data now has database `check` constraints for core type/range/shape validation on new writes.
- JSON imports now validate file size, array sizes, row shape, enum values, UUIDs, dates, timestamps, numeric ranges, and ownership before IndexedDB hydration or Supabase upsert.
- Global security headers now include CSP, `X-Content-Type-Options`, and `Referrer-Policy`.
