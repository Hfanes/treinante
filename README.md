# Treinante

Treinante is a running analytics platform for importing runs, analysing training, tracking progress, and using practical training tools. It is designed for road, trail, track, and mixed runners, with features that adapt to the data each runner provides.

## Status

This project is in active PRD-driven development. Product scope, feature order, and detailed requirements live in [`prd/README.md`](./prd/README.md).

## Tech Stack

- Next.js 16 with App Router
- React 19
- Tailwind CSS 4
- Supabase Auth, Postgres, and Storage
- IndexedDB via `idb`
- Chart.js with `react-chartjs-2`
- Strava OAuth through Next.js Route Handlers
- pnpm 11.5.0

## Features

- Supabase authentication, onboarding, and protected routes
- GPX upload, Strava sync, and manual run entry
- Normalised run storage across all import sources
- Per-run analysis with splits, pace, heart rate, elevation, and GAP
- Dashboard charts for volume, pace, elevation, and heart rate trends
- Personal record extraction and history
- Fitness and freshness tracking with ATL, CTL, and TSB
- Race prediction tools
- Segment matching and progress tracking
- Weekly training summaries
- Public training calculators

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Fill in the required values in `.env.local`, then start the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

## Environment Variables

Use `.env.local.example` as the source for required variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

Never commit real secrets, API keys, tokens, passwords, or credentials. Server-only secrets belong in `.env.local` locally and in the deployment provider environment for hosted environments.

## Scripts

- `pnpm dev` - start the Next.js dev server
- `pnpm build` - build the production app
- `pnpm start` - start the production server
- `pnpm lint` - run ESLint
- `pnpm test` - run Vitest
- `pnpm format` - format files with Prettier
- `pnpm format:check` - check Prettier formatting
- `pnpm db:push` - apply linked Supabase migrations
- `pnpm db:types` - generate linked Supabase TypeScript types

## Database Workflow

Database schema changes live in [`supabase/migrations`](./supabase/migrations). Do not rely on one-off SQL Editor changes as the source of truth.

Link the Supabase CLI once per machine:

```bash
pnpm exec supabase link --project-ref <ref>
```

Apply migrations:

```bash
pnpm db:push
```

Regenerate database types:

```bash
pnpm db:types
```

## Project Structure

```text
src/app/          Next.js App Router routes and route handlers
src/components/   Shared UI, layout, chart, run, tool, and segment components
src/hooks/        Client-side React hooks
src/lib/          Supabase, IndexedDB, import, calculation, and reporting helpers
src/types/        Shared TypeScript contracts and generated database types
prd/              Product requirements and build order
supabase/         SQL migrations and Supabase project files
```

## Development Notes

- Use `pnpm` for package operations, not npm or yarn.
- Do not install packages published less than 1 day ago.
- PRDs define product scope and implementation order.
- Keep schema changes in SQL migrations.
- Keep secrets out of git.

## Documentation

- [`prd/README.md`](./prd/README.md) - PRD index and suggested build order
- [`prd/00-overview/PRD.md`](./prd/00-overview/PRD.md) - product vision, architecture, and constraints
- [`AGENTS.md`](./AGENTS.md) - repository-specific working rules for agents
