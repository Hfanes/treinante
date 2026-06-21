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
- Settings export all data as JSON is not implemented. Deferred to PRD 02.
- Global toast for cold-start handling is not implemented. Deferred to PRD 12.

### Not Implemented Yet

- Delete account flow is not implemented. Needs confirm dialog and Supabase Auth admin hard delete.
- Cold-start skeleton handling is not fully implemented. Current retry UI shows inline wake-up text in onboarding/settings only.
- Sidebar no longer displays profile `name` by product choice; it now shows "Powered by" with the Strava logo.

### External Setup Required

- Google OAuth live verification requires Supabase provider setup and valid redirect URLs in Supabase Dashboard.

## PRD 02 — Data Layer: Supabase Schema, IndexedDB Cache, Sync & Export

Reviewed: 2026-06-07

### Deferred To Future PRDs

- Toast messages for Supabase mutation/import failures are not implemented. Deferred to PRD 12 toast infrastructure.
- JSON import post-processing re-runs personal records, fitness snapshots, and weekly reports. Segment recalculation remains deferred to PRD 09. Weekly reports resolved in PRD 10 on 2026-06-09.

### Not Implemented Yet

- Settings UI does not expose export/import controls yet, even though `useRuns` includes `exportJSON` and `importJSON`.
- Sync strategy is complete for `runs`; related stores are import/export-capable but do not yet background-sync independently from Supabase.
- IndexedDB currently stores full `Run` objects in one `runs` store, including split arrays and raw source metadata. Before PRD 09 segment matching or detailed route storage, consider splitting cache storage into lightweight indexed `runs` rows and lazy `run_details` rows for splits/raw payloads.

## PRD 03 — Run Import: GPX, Strava OAuth, Manual Entry

Reviewed: 2026-06-09

### Deferred To Future PRDs

- Post-import pipeline recalculates personal records, fitness snapshots, and weekly reports after import/delete. Segment recalculation remains deferred to PRD 09. Weekly reports resolved in PRD 10 on 2026-06-09.
- Import success/error toasts are inline page messages for now. Global toast system remains deferred to PRD 12.
- Delete does not re-run downstream analytics pipelines yet. Deferred with post-import pipeline work.

### Partial Implementations

- Strava Settings UI shows connected/not connected, incremental sync, full-history resync, delete Strava runs, and disconnect, but does not display athlete name because no athlete profile fields exist yet.
- Strava sync imports full paged history on first connect and streams when available, but does not yet implement advanced retry/rate-limit handling.
- Strava imports store computed per-km split points, not the full GPS point stream. PRD 04 does not require full route storage, but PRD 09 segment matching may need a `run_points` table or compressed route storage if per-km split points are too coarse.
- Run history supports sorting through a dropdown and clickable sortable headers, with filters by source/date range.

## PRD 04 — Per-Run Analysis

Reviewed: 2026-06-09

### Deferred To Future PRDs

- TSB card uses PRD 07 fitness snapshots once at least 7 unique training days exist.
- Run import/delete triggers personal record, fitness, and weekly report recalculation. Segment recalculation remains deferred to PRD 09. Weekly reports resolved in PRD 10 on 2026-06-09.

### Partial Implementations

- Chart zoom/pan is enabled through Chart.js plugins, but there is no explicit reset-zoom control yet.

## PRD 05 — Unified Activity Dashboard

Reviewed: 2026-06-09

### Deferred To Future PRDs

- Fitness preview displays PRD 07 `ctl_at_date`/`atl_at_date` snapshots when present.
- Quick actions route to existing `/runs` and `/settings` flows instead of opening a persistent global action menu or mobile FAB. Global action placement remains deferred to PRD 12.

### Partial Implementations

- Weekly chart bar clicks navigate to `/runs?dateFrom=...&dateTo=...`; `/runs` hydrates those query params into its existing filters, but the filters are still client-side only.
- Dashboard quick action for Strava opens Settings rather than triggering a dashboard-local sync with last-sync timestamp.

## PRD 06 — Personal Records & Bests

Reviewed: 2026-06-09

### Deferred To Future PRDs

- New PR success toasts are not implemented. Global toast infrastructure remains deferred to PRD 12.

### Partial Implementations

- Records page shows current PR cards and distance bests, but PR timeline chart is not implemented because the current `personal_records` schema stores only the latest best per type, not historical PR improvement events.
- Interpolated half-marathon and marathon records are inferred from the linked run distance being below the target distance; there is no dedicated `estimated` metadata column yet.

## PRD 07 — Fitness & Freshness

Reviewed: 2026-06-09

### Partial Implementations

- Fitness charts support shared date-range controls and per-chart zoom/pan, but direct cross-chart zoom event synchronization is not implemented to avoid brittle Chart.js ref coupling.
- Fitness snapshots are recalculated after run import/delete/sync and backfilled on `/fitness` when missing; existing stale snapshots are not periodically refreshed unless a run mutation or page backfill occurs.

## PRD 08 — Race Time Predictor

Reviewed: 2026-06-09

### Resolved In Future PRDs

- Race-related training tools were added to `/tools` in PRD 11 on 2026-06-15. The full automatic race predictor remains on `/predictor` rather than being duplicated in the public tools page.

### Partial Implementations

- Automatic VO2max uses one anchor effort by priority: best clean rolling window from the last 90 days, then whole-run average pace fallback. Rolling-window candidates are based on stored whole-kilometer splits, so partial-kilometer windows are not considered.
- HR-based VO2max uses Settings max HR first, then observed run max HR. Age-based `220 - age` fallback is not implemented because profiles do not currently store age or date of birth.

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

### Partial Implementations

- Some feature pages still contain legacy Tailwind gray/brand utility classes. A temporary global legacy utility bridge maps the visible old gray/brand classes onto PRD 12 tokens, but future UI work should continue replacing those with semantic component classes.
- Sidebar badge indicators for overreaching Fitness state and recent Records PR state are not wired yet; current data is available in feature pages but not exposed to the shell without extra queries.
- Tablet compact icon-only sidebar is not implemented; the current breakpoint switches from bottom nav to the full 240px sidebar at `md`.
- Chart accessibility summaries are partially covered by existing chart roles/labels, but Chart.js instances do not yet all provide the detailed PRD text summaries.

### Not Implemented Yet

- Theme toggle with `localStorage` values `'light' | 'dark' | 'system'` is not implemented. v1 remains dark-first as the design direction requires; light-mode overrides are still intentionally absent.
- Global toast infrastructure, PR toast variant, and Supabase cold-start toast are not implemented yet; existing success/error feedback remains inline.
- First-visit onboarding callouts per section are not implemented.

## PRD 14 — Strava Auto-Sync & Toast Notifications

Reviewed: 2026-06-21

### Implemented

- Connected users auto-sync Strava on protected app pages while the app tab is visible and online.
- New Strava imports show a styled toast and refresh current route data without a full browser reload.
- `/runs` listens for Strava sync completion and refreshes its local run cache/state.

### Intentional Product Choices

- Auto-sync uses browser polling while the app is open, not Strava webhooks or Vercel Cron.
