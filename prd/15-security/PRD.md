# PRD 15 — Security Hardening

## Goal

Close the security review findings around sessions, service keys, OAuth state, rate limits, and untrusted input validation.

## Scope

- Keep Supabase auth sessions out of `localStorage` and `sessionStorage`.
- Keep service-role access server-only.
- Validate Strava OAuth callbacks with a server-generated state nonce.
- Rate limit expensive authenticated operations.
- Add trusted-boundary validation for user-writable data and JSON imports.
- Add baseline browser security headers.

## Acceptance Criteria

- Strava connect starts from a server route and validates callback `state` before token exchange.
- Strava sync, refresh, delete, disconnect, and manual report generation are rate limited per user.
- Database constraints reject invalid new profile, run, segment, record, and report writes.
- JSON import validation rejects malformed or oversized files before local or remote writes.
- Security headers are configured globally.
- `prd/IMPLEMENTATION-GAPS.md` records the completed hardening work.
