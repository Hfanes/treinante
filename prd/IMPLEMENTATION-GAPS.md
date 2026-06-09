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
- Onboarding Step 3 does not include an explicit `Skip for now` link for heart-rate fields.
- Sidebar does not display profile `name` yet, even though onboarding collects it for sidebar and reports.

### External Setup Required

- Google OAuth live verification requires Supabase provider setup and valid redirect URLs in Supabase Dashboard.

## PRD 02 — Data Layer: Supabase Schema, IndexedDB Cache, Sync & Export

Reviewed: 2026-06-07

### Deferred To Future PRDs

- Toast messages for Supabase mutation/import failures are not implemented. Deferred to PRD 12 toast infrastructure.
- JSON import post-processing does not re-run personal records, fitness, segments, or weekly reports pipelines. Deferred to PRDs 06, 07, 09, and 10 where those pipelines are implemented.

### Not Implemented Yet

- Settings UI does not expose export/import controls yet, even though `useRuns` includes `exportJSON` and `importJSON`.
- Offline writes are not supported. Current behavior is cached offline reads only; mutations require Supabase success first.
- Sync strategy is complete for `runs`; related stores are import/export-capable but do not yet background-sync independently from Supabase.
- IndexedDB currently stores full `Run` objects in one `runs` store, including split arrays and raw source metadata. Before PRD 09 segment matching or detailed route storage, consider splitting cache storage into lightweight indexed `runs` rows and lazy `run_details` rows for splits/raw payloads.

## PRD 03 — Run Import: GPX, Strava OAuth, Manual Entry

Reviewed: 2026-06-09

### Deferred To Future PRDs

- Post-import pipeline does not recalculate personal records, fitness, segments, or weekly reports after import/delete. Deferred to PRDs 06, 07, 09, and 10 where those calculations are implemented.
- Import success/error toasts are inline page messages for now. Global toast system remains deferred to PRD 12.
- Manual run form is available on `/runs`, not from a global "Add run" dropdown anywhere in the app. Global action placement deferred to PRD 12 navigation/UI polish.
- Delete does not re-run downstream analytics pipelines yet. Deferred with post-import pipeline work.

### Partial Implementations

- Strava Settings UI shows connected/not connected, incremental sync, full-history resync, delete Strava runs, and disconnect, but does not display athlete name because no athlete profile fields exist yet.
- Strava sync imports full paged history on first connect and streams when available, but does not yet implement advanced retry/rate-limit handling.
- Strava imports store computed per-km split points, not the full GPS point stream. PRD 04 does not require full route storage, but PRD 09 segment matching may need a `run_points` table or compressed route storage if per-km split points are too coarse.
- Run history supports sorting through a dropdown and filters by source/date range; columns themselves are not clickable sortable headers.
- Run history limits to 25 rows but does not expose pagination controls yet.

## PRD 04 — Per-Run Analysis

Reviewed: 2026-06-09

### Deferred To Future PRDs

- TSB card displays only when `runs.tsb_at_date` already exists; computing ATL/CTL/TSB remains deferred to PRD 07.
- Run import/delete still does not trigger downstream personal record, fitness, segment, or weekly report recalculation. Deferred to PRDs 06, 07, 09, and 10 where those pipelines are implemented.

### Partial Implementations

- GAP is computed for the run detail display from stored per-km split elevations; existing imported rows are not backfilled with updated stored `raw_splits.gap` values.
- Whole-run GAP is averaged from available per-km splits. Current import data does not include a final partial split, so GAP ignores any trailing partial kilometer.
- Chart zoom/pan is enabled through Chart.js plugins, but there is no explicit reset-zoom control yet.

## PRD 05 — Unified Activity Dashboard

Reviewed: 2026-06-09

### Deferred To Future PRDs

- Fitness preview displays existing `ctl_at_date`/`atl_at_date` values when present, but does not compute CTL/ATL/TSB. Full fitness model remains deferred to PRD 07.
- Quick actions route to existing `/runs` and `/settings` flows instead of opening a persistent global action menu or mobile FAB. Global action placement remains deferred to PRD 12.

### Partial Implementations

- Weekly chart bar clicks navigate to `/runs?dateFrom=...&dateTo=...`; `/runs` hydrates those query params into its existing filters, but the filters are still client-side only.
- Dashboard quick action for Strava opens Settings rather than triggering a dashboard-local sync with last-sync timestamp.
