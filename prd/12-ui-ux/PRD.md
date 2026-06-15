# PRD 12 — UI/UX: Layout, Design System, Dark Mode, Mobile

## Overview

Instrument-grade analytics aesthetic. Dark olive-brown canvas, warm sand accents, Cormorant Garamond display type, Space Mono for all metrics and labels. Data-dense and contemplative — the UI feels like a precision field instrument, not a SaaS dashboard. Built from primitives with no third-party UI library. The UI adapts to available data — elevation, HR, and fitness sections appear only when relevant data exists.

---

## Design System Foundation

### Global CSS (`/src/app/globals.css`)

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

/* Google Fonts */
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Space+Mono&family=Inter:wght@400;500&display=swap");

:root {
  /* Surfaces */
  --background: oklch(0.235 0.012 80);
  --card: oklch(0.265 0.012 80);
  --muted: oklch(0.28 0.01 80);

  /* Text */
  --foreground: oklch(0.82 0.05 80);
  --bone: oklch(0.88 0.04 85);
  --muted-foreground: oklch(0.55 0.025 80);

  /* Brand */
  --primary: oklch(0.78 0.075 78);
  --primary-foreground: oklch(0.2 0.012 80);
  --secondary: oklch(0.62 0.05 78);

  /* Structure */
  --border: oklch(0.36 0.012 80);
  --destructive: oklch(0.55 0.18 28);

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 48px;
  --space-2xl: 96px;
}

/* Data semantic colors — chart fills, zone badges, trend arrows ONLY */
:root {
  --zone2: #22c55e;
  --zone3: #f59e0b;
  --zone4: #ef4444;
  --ctl: #60a5fa;
  --atl: #f87171;
  --tsb-positive: #4ade80;
  --tsb-negative: #f87171;
  --chart-pace: oklch(0.78 0.075 78);
  --chart-gap: oklch(0.62 0.05 78);
  --chart-hr: #f87171;
  --chart-elev: oklch(0.45 0.03 80);
  --trend-up: #4ade80;
  --trend-down: #f87171;
  --trend-neutral: oklch(0.55 0.025 80);
  --pr-gold: #fbbf24;
}
```

> **Critical:** Never use raw Tailwind color classes (e.g. `text-blue-500`, `bg-gray-800`) for brand colors. Always reference `var(--token)`. Zone and semantic colors (`--zone2`, `--trend-up`, etc.) are permitted only for chart fills, zone badges, and trend arrows — never for buttons, backgrounds, or nav chrome.

---

## Typography

Three voices. Never substitute. Never mix roles.

| Role    | Font               | Size     | Weight | Letter-spacing | Usage                             |
| ------- | ------------------ | -------- | ------ | -------------- | --------------------------------- |
| Display | Cormorant Garamond | 3.5rem   | 400    | -0.01em        | Page heroes only                  |
| H1      | Cormorant Garamond | 2.5rem   | 400    | -0.01em        | Page titles                       |
| H2      | Cormorant Garamond | 1.75rem  | 500    | 0              | Section titles                    |
| Body MD | Inter              | 1rem     | 400    | 0              | Paragraphs, descriptions          |
| Body SM | Inter              | 0.875rem | 400    | 0              | Table cells, form inputs          |
| Label   | Space Mono         | 0.68rem  | 400    | 0.14em         | ALL CAPS — eyebrows, axis labels  |
| Metric  | Space Mono         | 1.5rem   | 400    | 0.02em         | KPI numbers, measurements, counts |

**Hard rules:**

- ALL numeric values (counts, measurements, times, percentages) → Space Mono always
- Every metric value must have a Space Mono uppercase label above it
- Headings → Title Case, never ALL CAPS
- Labels → ALL CAPS with `letter-spacing: 0.14em` always
- Never use Cormorant Garamond for body text or metrics
- Never use Inter for labels or metric readouts

---

## Layout

### App Shell (`/src/app/(dashboard)/layout.tsx`)

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

**Overall app max-width:** 1280px. Hero sections use 96px top padding minimum.

### Sidebar Nav Items

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

Badge on "Fitness" if TSB < -20 (overreaching). Badge on "Records" if a PR was set in the last 7 days.

### Sidebar Nav Item Component

```css
.nav-item {
  font-family: "Space Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  padding: 8px 16px;
  border-radius: 2px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}
.nav-item:hover {
  color: var(--foreground);
  background: var(--muted);
}
.nav-item.active {
  color: var(--primary);
  background: var(--muted);
}
```

---

## Component Library (`/src/components/ui/`)

### Card

```css
.card {
  background: var(--card);
  border-top: 1px solid var(--border);
  border-radius: 2px;
  padding: 24px;
}
```

Interior structure (always in this order):

1. `<span class="label">UPPERCASE LABEL</span>` — Space Mono, `--secondary` color
2. Serif headline OR Metric value
3. Optional chart or secondary content

```tsx
interface CardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: number; // positive = up, negative = down
}

function Card({ label, value, unit, subtitle, trend }: CardProps) {
  return (
    <div className="card metric-card">
      <span className="metric-label">{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && (
        <span
          style={{
            fontFamily: "Inter",
            fontSize: "0.875rem",
            color: "var(--muted-foreground)",
          }}
        >
          {subtitle}
        </span>
      )}
      {trend !== undefined && <TrendIndicator value={trend} />}
    </div>
  );
}
```

```css
.metric-label {
  font-family: "Space Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--secondary);
}
.metric-value {
  font-family: "Space Mono", monospace;
  font-size: 1.5rem;
  letter-spacing: 0.02em;
  color: var(--bone);
}
.metric-unit {
  font-family: "Space Mono", monospace;
  font-size: 0.875rem;
  color: var(--secondary);
}
```

Page hero metrics use `font-size: 2rem` on `.metric-value`.

### Trend Indicator

```tsx
function TrendIndicator({ value }: { value: number }) {
  const isUp = value > 0.05;
  const isDown = value < -0.05;
  const color = isUp
    ? "var(--trend-up)"
    : isDown
      ? "var(--trend-down)"
      : "var(--trend-neutral)";
  const arrow = isUp ? "↑" : isDown ? "↓" : "→";
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.68rem",
        letterSpacing: "0.1em",
        color,
      }}
    >
      {arrow} {Math.abs(value * 100).toFixed(1)}%
    </span>
  );
}
```

Trend arrows always paired with a numeric value. `#4ade80` up, `#f87171` down, `var(--muted-foreground)` neutral (< 5% change).

### Badge

```css
/* Shared base */
.badge {
  font-family: "Space Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 2px;
  padding: 3px 8px;
}

/* Zone badges — data-only, never on UI chrome */
.badge-z2 {
  background: #15803d22;
  color: #22c55e;
  border: 1px solid #22c55e44;
}
.badge-z3 {
  background: #b4530922;
  color: #f59e0b;
  border: 1px solid #f59e0b44;
}
.badge-z4 {
  background: #dc262622;
  color: #ef4444;
  border: 1px solid #ef444444;
}

/* Source badges */
.badge-gpx {
  background: var(--muted);
  color: var(--primary);
}
.badge-strava {
  background: var(--muted);
  color: #fc4c02;
}
.badge-manual {
  background: var(--muted);
  color: var(--muted-foreground);
}

/* Form state badges */
.badge-fresh {
  background: #1d4ed822;
  color: #60a5fa;
}
.badge-optimal {
  background: #15803d22;
  color: #4ade80;
}
.badge-neutral {
  background: var(--muted);
  color: var(--muted-foreground);
}
.badge-fatigued {
  background: #b4530922;
  color: #f59e0b;
}
.badge-overreach {
  background: #dc262622;
  color: #ef4444;
}
```

```tsx
const badgeClass: Record<string, string> = {
  z2: "badge badge-z2",
  z3: "badge badge-z3",
  z4: "badge badge-z4",
  gpx: "badge badge-gpx",
  strava: "badge badge-strava",
  manual: "badge badge-manual",
  fresh: "badge badge-fresh",
  optimal: "badge badge-optimal",
  neutral: "badge badge-neutral",
  fatigued: "badge badge-fatigued",
  overreach: "badge badge-overreach",
};

function Badge({
  variant,
  children,
}: {
  variant: string;
  children: React.ReactNode;
}) {
  return <span className={badgeClass[variant]}>{children}</span>;
}
```

### Button Primary

```css
.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  font-family: "Inter", sans-serif;
  font-weight: 500;
  font-size: 0.875rem;
  border-radius: 2px;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-primary:hover {
  opacity: 0.88;
}
```

### Pill (Nav Chips, Filter Tags)

```css
.pill {
  font-family: "Space Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary);
  background: transparent;
  border: 1px solid var(--primary);
  border-radius: 999px;
  padding: 7px 16px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.pill:hover,
.pill.active {
  background: var(--primary);
  color: var(--primary-foreground);
}
```

### Skeleton Loading

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--muted) 25%,
    oklch(0.32 0.012 80) 50%,
    var(--muted) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease infinite;
  border-radius: 2px;
}
```

Match skeleton dimensions exactly to the content they replace. No third-party skeleton libraries.

```tsx
function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />;
}

// Usage
<Skeleton style={{ height: '1.5rem', width: '5rem' }} />   {/* metric value */}
<Skeleton style={{ height: '0.68rem', width: '8rem' }} />  {/* label */}
<Skeleton style={{ height: '16rem', width: '100%' }} />    {/* chart area */}
```

### Toast

```tsx
const { toast } = useToast();

toast.success("Run imported — 8.3 km");
toast.error("Sync failed — check connection");
toast.info("Waking up database...");
toast.pr("New 5k PR — 19:22"); // gold variant (#fbbf24) with trophy icon
```

Position: top-right on desktop, top-center on mobile. Auto-dismiss after 4s. Stacks up to 3.

---

## Elevation & Depth

**No drop shadows. No gradients on UI chrome. No glassmorphism.**

Depth hierarchy — only these three methods:

1. **Lightness shift** — `--card` is exactly one notch above `--background`
2. **Hairline border** — always `1px solid var(--border)`, never thicker
3. **Vertical-bar texture** — use at most once per viewport:

```css
.vbars {
  background-image: repeating-linear-gradient(
    90deg,
    oklch(0.78 0.075 78 / 0.12) 0px,
    oklch(0.78 0.075 78 / 0.12) 1px,
    transparent 1px,
    transparent 6px
  );
}
.vbars-dense {
  background-image: repeating-linear-gradient(
    90deg,
    oklch(0.78 0.075 78 / 0.12) 0px,
    oklch(0.78 0.075 78 / 0.12) 1px,
    transparent 1px,
    transparent 3px
  );
}
```

Apply `.vbars` behind hero panels, chart axes, section dividers. One textured surface per viewport.

---

## Motion & Animation

Animations should feel deliberate and physical — like a gauge needle settling.

### Card Entrance (Page Load)

```css
.metric-card {
  opacity: 0;
  transform: translateY(8px);
  animation: card-enter 0.4s ease forwards;
}
.metric-card:nth-child(1) {
  animation-delay: 0ms;
}
.metric-card:nth-child(2) {
  animation-delay: 60ms;
}
.metric-card:nth-child(3) {
  animation-delay: 120ms;
}
.metric-card:nth-child(4) {
  animation-delay: 180ms;
}

@keyframes card-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Metric Value Transitions

```css
.metric-value {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.metric-value.updating {
  opacity: 0.4;
  transform: translateY(-2px);
}
```

### Chart Entry

Chart.js: `duration: 600`, `easing: 'easeOutQuart'`. Bars grow from base. Lines draw left to right.

### Hover States

- Interactive elements: `opacity: 0.8`
- Cards on hover: `border-color` shifts from `--border` to `--primary`
- No scale transforms on cards (breaks the physical/grounded feeling)
- Pill nav: fill transition only, `transition: background 0.15s ease`

**Do not animate:** layout shifts, sidebar, modals (instant is fine).

---

## Chart Rules (Chart.js)

```javascript
const chartDefaults = {
  responsive: true,
  animation: { duration: 600, easing: "easeOutQuart" },
  plugins: {
    legend: {
      labels: {
        font: { family: "Space Mono", size: 11 },
        color: "oklch(0.62 0.05 78)", // --secondary
        boxWidth: 12,
        boxHeight: 2,
      },
    },
    tooltip: {
      backgroundColor: "oklch(0.265 0.012 80)", // --card
      borderColor: "oklch(0.36 0.012 80)", // --border
      borderWidth: 1,
      titleFont: { family: "Space Mono", size: 11 },
      bodyFont: { family: "Space Mono", size: 11 },
      titleColor: "oklch(0.62 0.05 78)",
      bodyColor: "oklch(0.88 0.04 85)",
      padding: 12,
      cornerRadius: 2,
    },
  },
  scales: {
    x: {
      grid: { color: "oklch(0.36 0.012 80)", lineWidth: 0.5 },
      ticks: {
        font: { family: "Space Mono", size: 10 },
        color: "oklch(0.62 0.05 78)",
      },
      border: { color: "oklch(0.36 0.012 80)" },
    },
    y: {
      grid: { color: "oklch(0.36 0.012 80)", lineWidth: 0.5 },
      ticks: {
        font: { family: "Space Mono", size: 10 },
        color: "oklch(0.62 0.05 78)",
      },
      border: { color: "oklch(0.36 0.012 80)" },
    },
  },
};

const barDefaults = { borderRadius: 0, borderWidth: 0 }; // NEVER round bar corners
const lineDefaults = {
  borderWidth: 1.5,
  pointRadius: 2,
  pointHoverRadius: 4,
  tension: 0.3,
};
```

**Axis-specific rules:**

- Inverted Y-axis (lower = better): `reverse: true`
- Time ticks: MM:SS always, never decimal
- Reference lines: `borderDash: [4, 4]`, color at 60% opacity
- Area fill: `fill: true`, `backgroundColor` at 20% opacity
- Charts sit flush to card edges — no inner padding around chart canvas

---

## Dark Mode

Dark-first. `--background` is the permanent canvas. Light mode is out of scope for v1.

Toggle stored in `localStorage` as `'light' | 'dark' | 'system'`. Defaults to system preference. Toggling adds/removes `dark` class on `<html>`.

Avoid flash on Next.js boot:

```tsx
// /src/app/layout.tsx
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

Chart.js dark mode: the design system is dark-only — always pass the dark-mode color tokens directly to Chart.js instances. No light/dark branching required for charts.

---

## Mobile Responsiveness

| Breakpoint | Width      | Changes                                         |
| ---------- | ---------- | ----------------------------------------------- |
| Mobile     | < 768px    | Bottom tab bar, stacked charts, 2-col card grid |
| Tablet     | 768–1024px | Compact sidebar (icons only), 2-col charts      |
| Desktop    | >= 1024px  | Full sidebar (240px), side-by-side charts       |

Mobile-specific:

- Run history table: show Date, Distance, Pace only — HR and D+ hidden
- Charts: minimum height 220px, zoom disabled (scroll/swipe instead)
- Cards: 2-column grid
- Bottom tab bar: Dashboard, Runs, Tools, Fitness, More
- Bottom tab bar uses Space Mono uppercase labels at 0.6rem

---

## Loading States

**App boot:** Skeleton shell while Next.js loads session and initial Supabase sync. Never blank.

**Page transitions:** Each page uses React Suspense boundaries with skeleton fallbacks matching the page's card layout.

**Chart loading:**

```tsx
<Suspense fallback={<Skeleton style={{ height: "16rem", width: "100%" }} />}>
  <PaceTrendChart runs={runs} />
</Suspense>
```

**Supabase cold start (> 3s):** Toast appears: "Database is waking up — takes a few seconds on first load"

---

## Adaptive UI Rules

The UI never shows empty charts, zero-value cards, or N/A fields.

- D+, D-, GAP, elevation charts: hidden if user has no runs with `elevation_gain > 0`
- HR cards and charts: hidden if user has no runs with `avg_hr` data
- Fitness section (CTL/ATL/TSB): hidden if fewer than 14 days of runs
- Zone badges: hidden if neither `max_hr` nor `ftp_pace` is set in profile
- Segment badges in run detail: hidden if user has no segments defined

---

## Accessibility

- All interactive elements keyboard-navigable
- Chart.js charts include `aria-label` with a text summary:
  `"Line chart showing pace trend. Last 30 days: improving from 5:30/km to 5:08/km average."`
- Color is never the only indicator — zone badges always include text label
- Focus rings: `outline: 2px solid var(--primary); outline-offset: 2px`
- All form inputs have associated `<label>` elements
- Contrast ratios meet WCAG AA

---

## Onboarding Callouts

First-visit contextual hints per section, stored in `localStorage`, dismissible:

| Page      | Hint                                                     |
| --------- | -------------------------------------------------------- |
| Dashboard | "Import your first run to see charts"                    |
| Runs      | "GPX files from your watch or phone work great"          |
| Segments  | "Define a segment to track progress on a specific route" |
| Fitness   | "Fills in after a couple of weeks of runs"               |
| Predictor | "Add more runs for more accurate predictions"            |

---

## Spatial Composition

- Asymmetry is welcome: a 7/5 column split with serif headline left and mono readout right is more on-brand than a balanced grid
- Sticky mono metadata anchors card corners like the corner of a map sheet
- Dense data sections contrast with open hero sections — the tension is intentional
- Charts sit flush to card edges — no inner padding around chart canvas

**Layout pattern:**

```
[summary strip full-width] → [charts side-by-side] → [data table or detail]
```

---

## AI Agent Implementation Rules

Follow on every component, every file, no exceptions:

1. **Tokens always** — `var(--primary)` etc., never raw Tailwind color classes for brand colors
2. **Space Mono on ALL numbers** — counts, measurements, times, percentages in metric cards
3. **Label above every metric** — Space Mono, uppercase, `--secondary` color, `0.14em` letter-spacing
4. **2px radius default** — cards, buttons, inputs; never `rounded-xl` or higher
5. **No shadows** — `box-shadow: none` always; depth from lightness shift + hairline border only
6. **Zone colors are data-only** — `#22c55e / #f59e0b / #ef4444` never on buttons, backgrounds, or nav
7. **Chart.js** — `barBorderRadius: 0`, gridlines `var(--border)`, ticks Space Mono, animation `easeOutQuart 600ms`
8. **Stagger card animations** — on mount, cards enter with `translateY(8px) → 0` staggered by 60ms
9. **Trend indicators** — `#4ade80` up, `#f87171` down, `var(--muted-foreground)` neutral; always paired with a number
10. **Cormorant Garamond = headings only** — never body text, never metric values, never labels
11. **Pill nav pattern** — filter chips and nav tags use 999px radius, Space Mono uppercase, sand outline → sand fill on active
12. **No gradients on chrome** — gradients only for `--chart-elev` fill and `.vbars` texture
