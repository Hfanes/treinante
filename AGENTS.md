# AGENTS.md

## Source Of Truth

- Start with `package.json`, `pnpm-workspace.yaml`, `eslint.config.mjs`, `postcss.config.mjs`, `app/globals.css`, then `prd/README.md`.
- PRDs live under `prd/`; build in the order listed in `prd/README.md` unless user says otherwise.
- If PRDs conflict with executable config, trust config and update PRDs in the same change.

## Working Rules

- Before implementing, state assumptions; if multiple interpretations exist, present them instead of choosing silently.
- If something is unclear, stop, name what is confusing, and ask.
- Prefer the minimum code that solves the request; no speculative features, single-use abstractions, or unrequested configurability.
- Touch only what the task requires. Do not refactor, reformat, or delete unrelated code.
- Match existing style even when you would choose differently.
- Remove imports, variables, and functions made unused by your own changes; do not remove pre-existing dead code unless asked.
- Every changed line should trace directly to the user's request.
- For multi-step work, use a brief plan with verification per step.
- Define success criteria and loop until verified. Do not claim tests/build ran unless the command was run.

## Stack Quirks

- Package manager is pnpm 11.5.0; use `pnpm`, not npm/yarn.
- App uses Next.js 16 + React 19. Protected-route logic belongs in `proxy.ts`; do not recreate `middleware.ts`.
- `next lint` is removed in Next 16 here. Use `pnpm lint`, which runs `eslint .`.
- Tailwind is v4 CSS-first. Tokens and dark variant are in `app/globals.css`; there is intentionally no `tailwind.config.ts`.
- Supabase auth uses `@supabase/ssr`, not deprecated `@supabase/auth-helpers-nextjs`.
- In Next 16 server code, `cookies()` from `next/headers` is async; `lib/supabase-server.ts` exports async `createServerClient()`.
- `pnpm-workspace.yaml` approves `sharp` builds and denies `unrs-resolver`; preserve this unless dependency policy changes.

## Commands

- Install/update deps: `pnpm install`
- Dev server: `pnpm dev`
- Lint: `pnpm lint`
- Build/typecheck: `pnpm build`
- Format write: `pnpm format`
- Format check: `pnpm format:check`
- No test script exists yet; do not claim tests ran unless one is added.

## App Boundaries

- Routes are in `app/`; auth pages under `app/(auth)`, protected app pages under `app/(dashboard)`, public tools at `app/tools`, Strava route handlers at `app/api/strava`.
- Shared contracts are in `types/index.ts`; normalize all import sources to the PRD `Run` shape before storage.
- Foundation modules under `lib/` are mostly typed stubs until their PRD phase is implemented.
- UI primitives live in `components/ui`; layout shell lives in `components/layout`.

## Environment

- Use `.env.local.example` as a reference for required environment variables.
- Do not write actual values to `.env.local.example`.
- Put real secrets only in `.env.local`.
- Never commit secrets, API keys, tokens, passwords, or credentials to the repository.
- Server-only secrets include `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_CLIENT_ID`, and `STRAVA_CLIENT_SECRET`.
