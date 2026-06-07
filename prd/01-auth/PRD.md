# PRD 01 — Authentication & User Profiles

## Overview

All app data is user-scoped. Authentication is handled by Supabase Auth. Each user gets a `profiles` row on first sign-in, completed during a lightweight onboarding flow. No assumption is made about the user's running discipline or goals during sign-up — the app adapts to their data.

---

## Auth methods

| Method           | Provider                 |
| ---------------- | ------------------------ |
| Email + password | Supabase built-in        |
| Google OAuth     | Supabase Google provider |

Strava OAuth is a **data source connection**, not a login method. Managed separately in Settings (see PRD 03).

---

## Next.js auth setup

### Proxy (`/proxy.ts`)

Protects all routes under `/(dashboard)`. Uses `@supabase/ssr` to read and refresh the session from cookies:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/runs") ||
    req.nextUrl.pathname.startsWith("/records") ||
    req.nextUrl.pathname.startsWith("/fitness") ||
    req.nextUrl.pathname.startsWith("/predictor") ||
    req.nextUrl.pathname.startsWith("/segments") ||
    req.nextUrl.pathname.startsWith("/reports") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isProtected && !user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}
```

### Server component client (`/lib/supabase-server.ts`)

```typescript
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );
}
```

Used in server components to fetch initial data without a loading state (faster first paint).

---

## User profile schema

Schema changes live in `supabase/migrations/*.sql` and are applied with `pnpm db:push`; do not use SQL Editor as the long-term source of truth.

```sql
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  weekly_km_goal numeric not null default 30,
  max_hr integer,
  resting_hr integer,
  ftp_pace integer,                    -- sec/km, functional threshold pace
  strava_connected boolean not null default false,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from anon, authenticated, public;
```

---

## Onboarding flow

A 3-step modal shown after first login when `onboarding_complete = false`. Overlaid on the dashboard skeleton — not a separate page.

**Step 1 — Name**

- Input: display name (required, used in the sidebar and reports)

**Step 2 — Weekly goal**

- Weekly km goal: number input, default 30
- Helper: "How many km do you aim to run per week on average?"
- No discipline or race target asked — the app is for all runners

**Step 3 — Heart rate (optional but recommended)**

- Max HR — number input
- Helper: "Average HR from a recent all-out 20-min effort, or leave blank to set later"
- Resting HR — number input (optional)
- "Skip for now" link — can be set later in Settings

On completion: write all fields to `profiles`, set `onboarding_complete = true`, dismiss modal.

---

## Route structure

```
/login              → public (redirects to /dashboard if already logged in)
/signup             → public
/tools              → public (calculators, no data)
/dashboard          → protected
/runs               → protected
/runs/[id]          → protected
/records            → protected
/fitness            → protected
/predictor          → protected
/segments           → protected
/reports            → protected
/settings           → protected
```

After login, redirect to `/dashboard` unless `?next=` param is present.

---

## useAuth hook

```typescript
// /hooks/useAuth.ts
const {
  user, // Supabase User | null
  profile, // Profile | null
  loading, // boolean — initial session check
  signIn, // (email, password) => Promise
  signUp, // (email, password) => Promise
  signInWithGoogle, // () => Promise
  signOut, // () => Promise
  updateProfile, // (Partial<Profile>) => Promise
} = useAuth();
```

---

## Settings — account section

- Edit name and weekly km goal
- Edit max HR, resting HR, FTP pace
- Connect / disconnect Strava (see PRD 03)
- Export all data as JSON (see PRD 02)
- Delete account — confirm dialog, then hard delete via Supabase Auth admin

---

## Cold start handling

On first Supabase request after DB pause (free tier):

1. Retry once after 2 seconds on timeout/503
2. Toast: "Waking up — takes a few seconds on first load"
3. Show skeleton UI while waiting — never a blank page
