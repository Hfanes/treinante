# PRD 12 — UI/UX: Layout, Design System, Dark Mode, Mobile

## Overview

Clean, data-dense analytics aesthetic. Dark mode supported from day one. Mobile responsive. Tailwind CSS 4 throughout with consistent design tokens. No third-party UI library — built from primitives. The UI adapts to available data — elevation, HR, and fitness sections appear only when relevant data exists, keeping the experience clean for all runner types.

---

## Layout

### App shell (`/app/(dashboard)/layout.tsx`)

```
┌───────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main content (flex-1)  │
│                         │                         │
│  [Logo: RunMetrics]     │  [Top bar]              │
│                         │                         │
│  [Nav items]            │  [Page content]         │
│                         │   scrollable            │
│  ─────────────          │                         │
│  [User name]            │                         │
│  [Settings]             │                         │
└───────────────────────────────────────────────────┘
```

On mobile (< 768px): sidebar becomes a bottom tab bar with 5 primary icons. A "More" item opens a drawer for secondary nav items.

### Sidebar nav items

```
Dashboard       /dashboard
Runs            /runs
Records         /records
Fitness         /fitness
Predictor       /predictor
Segments        /segments
Reports         /reports
─────────────
Tools           /tools
Settings        /settings
```

Badge on "Fitness" if TSB < -20 (overreaching).
Badge on "Records" if a PR was set in the last 7 days.

---

## Design tokens (`/app/globals.css`)

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-zone2: #22c55e;
  --color-zone3: #f59e0b;
  --color-zone4: #ef4444;
  --color-fresh: #3b82f6;
  --color-optimal: #22c55e;
  --color-neutral: #6b7280;
  --color-fatigued: #f59e0b;
  --color-overreach: #ef4444;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}
```

### Typography rules

- Page titles: `text-xl font-semibold`
- Card labels: `text-xs text-gray-500 uppercase tracking-wide`
- Card values: `text-2xl font-semibold font-mono` — monospace for consistent number width
- Table data: `text-sm`
- Pace and time values always use `font-mono` for alignment in tables and charts

---

## Component library (`/components/ui/`)

### Card

```tsx
interface CardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // positive = up, negative = down
}

function Card({ label, value, subtitle, trend }: CardProps) {
  return (
    <div
      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200
                    dark:border-gray-700 p-4 flex flex-col gap-1"
    >
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-semibold font-mono text-gray-900 dark:text-white">
        {value}
      </span>
      {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      {trend !== undefined && <TrendIndicator value={trend} />}
    </div>
  );
}
```

### Badge

Variants: `z2`, `z3`, `z4`, `gpx`, `strava`, `manual`, `fresh`, `optimal`, `neutral`, `fatigued`, `overreach`

```tsx
const variantClasses: Record<string, string> = {
  z2: "bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300",
  z3: "bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300",
  z4: "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300",
  strava:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  optimal:
    "bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300",
  fatigued:
    "bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300",
  overreach:
    "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300",
  // ...
};
```

### Skeleton

```tsx
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}
```

Usage patterns:

```tsx
<Skeleton className="h-8 w-20" />      // card value
<Skeleton className="h-4 w-32" />      // label
<Skeleton className="h-64 w-full" />   // chart area
```

### Toast

```tsx
const { toast } = useToast();

toast.success("Run imported — 8.3 km");
toast.error("Sync failed — check connection");
toast.info("Waking up database...");
toast.pr("New 5k PR — 19:22"); // gold variant with trophy icon
```

Position: top-right on desktop, top-center on mobile. Auto-dismiss after 4s. Stacks up to 3.

---

## Dark mode

Toggle stored in `localStorage` as `'light' | 'dark' | 'system'`. Defaults to system preference.

Toggling adds/removes `dark` class on `<html>`. All `dark:` Tailwind variants activate.

In Next.js, set the initial class in `layout.tsx` from a script to avoid flash:

```tsx
// /app/layout.tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
    const t = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (t === 'dark' || (!t && prefersDark)) document.documentElement.classList.add('dark')
  `,
  }}
/>
```

Chart.js dark mode: detect theme in chart components and pass theme-aware colours:

```typescript
const isDark =
  typeof window !== "undefined" &&
  document.documentElement.classList.contains("dark");

const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
const labelColor = isDark ? "#9CA3AF" : "#6B7280";
```

---

## Mobile responsiveness

| Breakpoint | Width      | Changes                                         |
| ---------- | ---------- | ----------------------------------------------- |
| Mobile     | < 768px    | Bottom tab bar, stacked charts, 2-col card grid |
| Tablet     | 768–1024px | Compact sidebar (icons only), 2-col charts      |
| Desktop    | >= 1024px  | Full sidebar, side-by-side charts               |

Mobile-specific:

- Run history table: show Date, Distance, Pace only. HR and D+ hidden.
- Charts: minimum height 220px, zoom disabled (scroll/swipe instead)
- Cards: 2-column grid
- Bottom tab bar: Dashboard, Runs, Tools, Fitness, More

---

## Loading states

**App boot:** Skeleton shell while Next.js loads the session and runs initial Supabase sync. Never blank.

**Page transitions (Next.js App Router):** Each page uses React Suspense boundaries with skeleton fallbacks matching the page's card layout.

**Chart loading:**

```tsx
<Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
  <PaceTrendChart runs={runs} />
</Suspense>
```

**Supabase cold start (> 3s):** Toast appears: "Database is waking up — takes a few seconds on first load"

---

## Adaptive UI rules

The UI never shows empty charts, zero-value cards, or N/A fields. Rules:

- D+, D-, GAP, elevation charts: hidden if user has no runs with elevation_gain > 0
- HR cards and charts: hidden if user has no runs with avg_hr data
- Fitness section (CTL/ATL/TSB): hidden if fewer than 14 days of runs
- Zone badges: hidden if neither max_hr nor ftp_pace is set in profile
- Segment badges in run detail: hidden if user has no segments defined

---

## Accessibility

- All interactive elements keyboard-navigable
- Chart.js charts include `aria-label` with a text summary: "Line chart showing pace trend. Last 30 days: improving from 5:30/km to 5:08/km average."
- Colour is never the only indicator — zone badges always include text label
- Focus rings visible in light and dark mode (`ring-2 ring-brand-500`)
- All form inputs have associated `<label>` elements
- Contrast ratios meet WCAG AA in both light and dark mode

---

## Onboarding callouts

First-visit contextual hints per section, stored in `localStorage`, dismissible:

| Page      | Hint                                                     |
| --------- | -------------------------------------------------------- |
| Dashboard | "Import your first run to see charts"                    |
| Runs      | "GPX files from your watch or phone work great"          |
| Segments  | "Define a segment to track progress on a specific route" |
| Fitness   | "Fills in after a couple of weeks of runs"               |
| Predictor | "Add more runs for more accurate predictions"            |
