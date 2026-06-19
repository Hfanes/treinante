---
version: 2.0
description: >
  Instrument-grade analytics design system. Dark olive-brown surfaces,
  warm sand accents, Cormorant Garamond display type, Space Mono metrics.
  Data-dense and contemplative — numbers feel physical, like engravings
  on metal rather than pixels on glass.
---

## Aesthetic Direction

**Concept:** Editorial field journal meets precision instrument.
**Mood:** Quiet, considered, physical. Not a SaaS dashboard — an instrument.
**What makes it unforgettable:** The pairing of high-contrast serif headlines
against stamped monospace metrics, on a single warm olive-brown hue, with
no shadows and no gradients. Restraint executed with precision.

DO commit to this direction fully. DO NOT drift toward generic dashboard
aesthetics (blue accents, rounded cards, shadow hierarchy, Inter everywhere).

---

## Color Tokens

Define in `:root` as CSS custom properties. Never use raw Tailwind color
classes (e.g. `text-blue-500`) for brand colors — always reference tokens.

```css
:root {
  /* Surfaces */
  --background: oklch(0.235 0.012 80); /* Dark olive-brown canvas */
  --card: oklch(0.265 0.012 80); /* Lifted surface — 1 notch only */
  --muted: oklch(0.28 0.01 80); /* Subtle fills */

  /* Text */
  --foreground: oklch(0.82 0.05 80); /* Bone-warm body text */
  --bone: oklch(0.88 0.04 85); /* Hero metrics, display headlines */
  --muted-foreground: oklch(0.55 0.025 80); /* Tertiary metadata */

  /* Brand — single hue, three values */
  --primary: oklch(0.78 0.075 78); /* Sand — CTAs, links, focus rings */
  --primary-foreground: oklch(0.2 0.012 80); /* Dark ink on sand */
  --secondary: oklch(0.62 0.05 78); /* Dimmed sand — labels, captions */

  /* Structure */
  --border: oklch(0.36 0.012 80); /* Hairline dividers only, never fills */
  --destructive: oklch(0.55 0.18 28); /* Rust — errors, delete, negative */
}
```

### Data Semantic Colors

Permitted exceptions to the single-hue rule.
**Scope:** chart fills, zone badges, trend arrows, PR toasts ONLY.
**Never use for:** buttons, backgrounds, nav, UI chrome.

```css
:root {
  /* Training zones — vibrant, intentional */
  --zone2: #22c55e; /* Vibrant green  — aerobic / easy */
  --zone3: #f59e0b; /* Vibrant amber  — threshold */
  --zone4: #ef4444; /* Vibrant red    — hard / Z4+ */

  /* Performance Management Chart — high contrast warm pair */
  --ctl: #f3d49b; /* Bright sand — chronic training load (fitness) */
  --atl: #7f6d4d; /* Dark bronze — acute training load (fatigue) */
  --tsb-positive: #f3d49b; /* Bright sand — TSB positive / fresh */
  --tsb-negative: #6f674d; /* Deep olive — TSB negative / fatigued */

  /* Chart series */
  --chart-pace: #f3d49b; /* Bright sand — primary pace line */
  --chart-gap: #7f6d4d; /* Dark bronze — GAP dashed line */
  --chart-hr: #8f815f; /* Olive — HR line */
  --chart-elev: oklch(0.45 0.03 80); /* Muted olive — elevation fill */

  /* Trends & feedback */
  --trend-up: #4ade80; /* Green arrow — positive delta */
  --trend-down: #f87171; /* Red arrow   — negative delta */
  --trend-neutral: oklch(0.55 0.025 80); /* Muted       — < 5% change */
  --pr-gold: #fbbf24; /* Gold — PR toast, trophy icon */
}
```

Two-series charts must use deliberate light/dark separation, not adjacent
midtones. Preferred pair: `--ctl` / `--atl` or `--chart-pace` /
`--chart-gap`. If both series share hue, differentiate with value, stroke
weight, and dash pattern.

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

**Load via Google Fonts:**

```html
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Space+Mono&family=Inter:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

---

## Spacing (8px grid — strict)

```
--space-xs:   4px
--space-sm:   8px
--space-md:   16px
--space-lg:   24px
--space-xl:   48px
--space-2xl:  96px
```

Hero sections and page tops use `96px` padding minimum.
Content columns max-width: `~70ch` for readability.
Overall app max-width: `1280px`.

---

## Border Radius (architectural, square)

```
2px   → cards, buttons, inputs (default)
4px   → only when a control must read as obviously tappable
999px → pills only: nav chips, filter tags
```

Never exceed `4px` on functional controls. No `rounded-xl`, no `rounded-2xl`.

---

## Elevation & Depth

**No drop shadows. No gradients on UI chrome. No glassmorphism.**

Depth hierarchy (only these three methods):

1. **Lightness shift** — `--card` is exactly one notch above `--background`
2. **Hairline border** — always `1px solid var(--border)`, never thicker
3. **Vertical-bar texture** — use maximum once per viewport as a mark:

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

Apply `.vbars` behind hero panels, chart axes, section dividers.
One textured surface per viewport — more becomes noise.

---

## Motion & Animation

Animations should feel deliberate and physical — like a gauge needle
settling, not a generic fade-in.

**Page load:** Staggered reveal on metric cards. One orchestrated entrance
is more powerful than scattered micro-interactions everywhere.

```css
/* Stagger metric cards on mount */
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

**Metric value transitions:** When data updates, animate the number
with a brief counter-tick feel (not a slow morph):

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

**Chart entry:** Chart.js animations — use `duration: 600`,
`easing: 'easeOutQuart'`. Bars grow from base. Lines draw left to right.

**Hover states:** Subtle — `opacity: 0.8` on interactive elements,
`border-color` shift from `--border` to `--primary` on cards.
No scale transforms on cards (breaks the physical/grounded feeling).

**Pill nav hover:** Fill transition only, `transition: background 0.15s ease`.

**Do not animate:** Layout shifts, sidebar, modals (instant is fine).
Motion is for data and moments of delight — not navigation chrome.

---

## Spatial Composition

**Hierarchy through scale and spacing, not boxes.**
Whitespace is a first-class material — let it breathe.

- Asymmetry is welcome: a 7/5 column split with serif headline left
  and mono readout right is more on-brand than a balanced grid
- Sticky mono metadata anchors card corners like the corner of a map sheet
- Dense data sections contrast with open hero sections — the tension is intentional
- Charts sit flush to card edges — no inner padding around chart canvas

**Layout pattern:**

```
[summary strip full-width] → [charts side-by-side] → [data table or detail]
```

---

## Component Specs

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

1. `<span class="label">UPPERCASE LABEL</span>` — Space Mono, secondary color
2. Serif headline OR Metric value
3. Optional chart or secondary content

### Metric Card

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
  font-size: 1.5rem; /* 2rem for hero metrics */
  letter-spacing: 0.02em;
  color: var(--bone);
}
.metric-unit {
  font-family: "Space Mono", monospace;
  font-size: 0.875rem;
  color: var(--secondary); /* unit suffix e.g. "km", "bpm", "%", "ms" */
}
```

### Badge

```css
/* Zone badges */
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

/* Shared badge base */
.badge {
  font-family: "Space Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 2px;
  padding: 3px 8px;
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

### Pill (nav chips, filter tags)

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

### Sidebar Nav Item

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

## Chart Rules (Chart.js)

```javascript
// Base defaults — apply to every Chart.js instance
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

// Bar charts
const barDefaults = {
  borderRadius: 0, // NEVER round bar corners
  borderWidth: 0,
};

// Line charts
const lineDefaults = {
  borderWidth: 1.5,
  pointRadius: 2,
  pointHoverRadius: 4,
  tension: 0.3,
};
```

**Axis-specific rules:**

- Inverted Y-axis (when lower value = better): `reverse: true`
- Time tick format: MM:SS always, never decimal
- Reference lines: `borderDash: [4, 4]`, color at 60% opacity
- Area fill: `fill: true`, `backgroundColor` at 20% opacity

---

## Skeleton Loading

Match skeleton dimensions exactly to the content they replace.
Use the animation below — no third-party skeleton libraries.

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

---

## Dark Mode

Dark-first. `--background` is the permanent canvas.
Light mode is out of scope for v1 — do not add light mode overrides.

---

## AI Agent Rules

Follow these on every component, every file, no exceptions:

1. **Tokens always** — use CSS custom properties (`var(--primary)` etc.), never raw Tailwind color classes for brand colors
2. **Space Mono on ALL numbers** — any numeric value: counts, measurements, times, percentages in metric cards
3. **Label above every metric** — Space Mono, uppercase, `--secondary` color, `0.14em` letter-spacing
4. **2px radius default** — cards, buttons, inputs; never `rounded-xl` or higher
5. **No shadows** — `box-shadow: none` always; depth comes from lightness shift + hairline border
6. **Zone colors are data-only** — `#22c55e / #f59e0b / #ef4444` never appear on buttons, backgrounds, or nav
7. **Chart.js** — `barBorderRadius: 0`, gridlines `var(--border)`, ticks `Space Mono`, animation `easeOutQuart 600ms`
8. **Stagger card animations** — on page mount, cards enter with `translateY(8px) → 0` staggered by 60ms
9. **Trend indicators** — `#4ade80` up, `#f87171` down, `var(--muted-foreground)` neutral; always paired with a number
10. **Cormorant Garamond = headings only** — never body text, never metric values, never labels
11. **Pill nav pattern** — filter chips and nav tags use 999px radius, Space Mono uppercase, sand outline → sand fill on active
12. **No gradients on chrome** — gradients only permitted for `--chart-elev` fill and `.vbars` texture
