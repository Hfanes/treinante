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

- Settings Strava connect/disconnect is not implemented. Deferred to PRD 03.
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
- JSON import post-processing does not re-run personal records, fitness, segments, or weekly reports pipelines. Deferred to PRDs 04, 06, 07, 09, and 10 where those pipelines are implemented.

### Not Implemented Yet

- Settings UI does not expose export/import controls yet, even though `useRuns` includes `exportJSON` and `importJSON`.
- Offline writes are not supported. Current behavior is cached offline reads only; mutations require Supabase success first.
- Sync strategy is complete for `runs`; related stores are import/export-capable but do not yet background-sync independently from Supabase.
