# PRD 16 — Strava Login

## Goal

Let users create or access Treinante accounts with Strava OAuth while keeping the existing email/password, Google, and Settings Strava-connect flows.

## Problem

Treinante already supports Strava as a run-import connection, but users still need a separate Treinante login method. Runners who primarily identify through Strava should be able to sign in with Strava and immediately sync runs without a second connection step.

## Scope

- Add Strava as a login/signup option through Supabase Auth custom OAuth provider `custom:strava`.
- Keep email/password and Google OAuth login.
- On successful Strava login, store Strava sync tokens so the user is already connected for imports.
- Prevent one Strava athlete account from being linked to multiple Treinante users.
- Keep Settings Strava connect for users who sign in with email/password or Google.
- Adapt Account Security settings so OAuth-only accounts are not shown password-change controls.
- Add a local "Last used" login-method hint on auth pages.

## Non-Goals

- Automatic merging of existing Treinante accounts.
- Guess-linking accounts by email or athlete name.
- Replacing Google or email/password login.
- Strava webhooks or background sync changes.
- Adding password login to OAuth-only accounts in this phase.

## Product Rules

- One Strava athlete account can belong to only one Treinante user.
- Strava login also connects Strava sync for that Treinante user.
- Existing email/password or Google users connect Strava from Settings if they want run sync.
- If a Strava account is already linked elsewhere, the app rejects the link with clear copy.
- "Last used" login method is a per-browser hint, not account state.

## Supabase Provider Setup

Configure a Supabase Custom OAuth provider:

| Field             | Value                                           |
| ----------------- | ----------------------------------------------- |
| Identifier        | `custom:strava`                                 |
| Provider type     | OAuth2                                          |
| Authorization URL | `https://www.strava.com/oauth/authorize`        |
| Token URL         | `https://www.strava.com/oauth/token`            |
| UserInfo URL      | `https://<app-domain>/api/auth/strava/userinfo` |
| Scopes            | `read`, `activity:read_all`                     |
| Email optional    | Enabled if Strava does not return email         |

The Strava app must allow the callback URL displayed by Supabase for this custom provider.

The userinfo URL proxies Strava's athlete response and adds `sub` from Strava `id`, because Supabase custom OAuth needs a provider subject identifier.

## Database Changes

- Add `strava_athlete_id bigint` to `public.strava_tokens`.
- Backfill existing rows from stored token/API data where possible, or leave null until reconnect if not possible.
- Add a unique partial index on `strava_athlete_id` where not null.
- Store athlete ID for both Strava login and Settings Strava connect.

Duplicate-link error copy:

`This Strava account is already linked to another Treinante account. Log out and continue with Strava, or disconnect it from the other account first.`

## Auth Flow

### Strava Login

1. User clicks `Continue with Strava` on `/login` or `/signup`.
2. Client calls Supabase OAuth with provider `custom:strava`.
3. Supabase redirects back to `/auth/callback`.
4. The callback exchanges the code for a session.
5. If the login provider is Strava, the callback stores the provider token, refresh token, expiry, and athlete ID in `strava_tokens`.
6. The callback sets `profiles.strava_connected = true` and stores athlete display name when available.
7. The callback sets `treinante_last_login=strava`.
8. User lands on the safe `next` path, defaulting to `/dashboard`.

### Google Login

- Existing Google OAuth behavior remains.
- On successful callback, set `treinante_last_login=google`.

### Email Login

- Existing email/password behavior remains.
- On successful login, set `treinante_last_login=email`.

### Settings Strava Connect

- Settings Strava connect uses Supabase `linkIdentity` with provider `custom:strava` so Strava only needs the Supabase callback domain.
- The auth callback stores sync tokens, sets `profiles.strava_connected = true`, and obeys the unique ownership rule.

## Auth UI

- Show email/password form.
- Show `Continue with Google`.
- Show `Continue with Strava`.
- Show a `Last used` badge beside the method stored in `treinante_last_login`.
- Add short helper copy near Strava login:
  `Use Strava to create or log into a Strava-linked Treinante account.`

## Account Security UI

The settings security card must adapt to the authenticated user's identities.

### Email/password account

- Show current email.
- Show change email form.
- Show change password form.
- Show delete account.

### Google-only account

- Show `Signed in with Google`.
- Show current email if present.
- Hide change password form.
- Keep delete account.

### Strava-only account

- Show `Signed in with Strava`.
- Show current email if present; otherwise show `No email on this account`.
- Hide change password form.
- Hide change email form unless email/password linking is implemented later.
- Keep delete account.

### Mixed account

- Show all linked providers.
- Show password controls only when an email/password identity exists.

## Last Used Login Hint

- Store `treinante_last_login` as a non-sensitive cookie.
- Allowed values: `email`, `google`, `strava`.
- Read it on `/login` and `/signup` server pages.
- Pass it to `AuthForm`.
- Render a small `Last used` badge next to the matching login method.
- Do not clear it on logout.

## Acceptance Criteria

- Login/signup pages show Strava, Google, and email/password options.
- Strava OAuth creates or logs into a Treinante account through Supabase Auth.
- Strava-login users are automatically marked Strava-connected for sync.
- The same Strava athlete cannot be connected to two Treinante users.
- Settings Strava connect still works for email/password and Google users.
- Account Security settings hide password controls for OAuth-only users.
- Auth pages show `Last used` for the most recent successful login method on that browser.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.
