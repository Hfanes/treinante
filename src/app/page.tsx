import Link from "next/link";
import { Bird, BriefcaseBusiness, GitBranch, Mail } from "lucide-react";

import {
  FitnessPreviewChart,
  HrTrendChart,
  PaceTrendChart,
} from "@/components/dashboard/dashboard-charts";
import { Card } from "@/components/ui";
import { createServerClient } from "@/lib/supabase-server";
import type { FitnessPoint, HrPoint, PacePoint } from "@/lib/dashboardAnalysis";

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-medium !text-[var(--primary-foreground)] no-underline transition hover:opacity-90";
const secondaryActionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[2px] border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm font-medium text-[var(--bone)] no-underline transition hover:border-[var(--primary)] hover:text-[var(--primary)]";

const pacePoints: PacePoint[] = [
  { date: "2026-04-06", pace: 327, gap: 319, rollingPace: null, distance: 8.2 },
  {
    date: "2026-04-10",
    pace: 315,
    gap: 312,
    rollingPace: null,
    distance: 10.1,
  },
  { date: "2026-04-14", pace: 342, gap: 329, rollingPace: null, distance: 7.4 },
  {
    date: "2026-04-18",
    pace: 304,
    gap: 301,
    rollingPace: null,
    distance: 12.6,
  },
  { date: "2026-04-22", pace: 318, gap: 309, rollingPace: null, distance: 9.5 },
  {
    date: "2026-04-26",
    pace: 336,
    gap: 324,
    rollingPace: null,
    distance: 16.2,
  },
  { date: "2026-04-30", pace: 311, gap: 307, rollingPace: 322, distance: 8.8 },
  { date: "2026-05-04", pace: 306, gap: 303, rollingPace: 319, distance: 11.3 },
  { date: "2026-05-08", pace: 299, gap: 296, rollingPace: 317, distance: 6.1 },
  { date: "2026-05-12", pace: 314, gap: 309, rollingPace: 313, distance: 13.4 },
  { date: "2026-05-16", pace: 302, gap: 300, rollingPace: 313, distance: 10.2 },
  { date: "2026-05-20", pace: 294, gap: 292, rollingPace: 307, distance: 5.0 },
];

const hrPoints: HrPoint[] = [
  { date: "2026-04-06", hr: 148, rollingHr: null },
  { date: "2026-04-10", hr: 151, rollingHr: null },
  { date: "2026-04-14", hr: 144, rollingHr: null },
  { date: "2026-04-18", hr: 156, rollingHr: null },
  { date: "2026-04-22", hr: 149, rollingHr: null },
  { date: "2026-04-26", hr: 153, rollingHr: null },
  { date: "2026-04-30", hr: 147, rollingHr: 150 },
  { date: "2026-05-04", hr: 145, rollingHr: 149 },
  { date: "2026-05-08", hr: 150, rollingHr: 149 },
  { date: "2026-05-12", hr: 146, rollingHr: 149 },
  { date: "2026-05-16", hr: 143, rollingHr: 148 },
  { date: "2026-05-20", hr: 141, rollingHr: 146 },
];

const fitnessPoints: FitnessPoint[] = Array.from({ length: 36 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  return {
    date: `2026-05-${day}`,
    ctl: Math.round(32 + index * 0.7 + Math.sin(index / 4) * 2),
    atl: Math.round(38 + Math.sin(index / 3) * 8 + index * 0.35),
  };
});

const capabilities = [
  [
    "Import",
    "Bring in GPX files or Strava activities without locking the app to one running discipline.",
  ],
  [
    "Analyze",
    "Read splits, grade-adjusted pace, stops, heart-rate drift, and effort zones from each run.",
  ],
  [
    "Trend",
    "Watch pace, heart rate, fitness, fatigue, records, and reports move together over time.",
  ],
] as const;

const socialLinks = [
  {
    href: "https://github.com/Hfanes",
    icon: GitBranch,
    label: "github",
    text: "github",
  },
  {
    href: "https://www.linkedin.com/in/hugofanes/",
    icon: BriefcaseBusiness,
    label: "linkedin",
    text: "linkedin",
  },
  {
    href: "https://x.com/hfa_dev",
    icon: Bird,
    label: "x/twitter",
    text: "x/twitter",
  },
  {
    href: "mailto:anesfh@gmail.com",
    icon: Mail,
    label: "email",
    text: "email",
  },
] as const;

async function getLoggedInState() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return Boolean(user);
  } catch {
    return false;
  }
}

export default async function Home() {
  const isLoggedIn = await getLoggedInState();
  const primaryHref = isLoggedIn ? "/dashboard" : "/signup";
  const primaryLabel = isLoggedIn ? "Open dashboard" : "Start free";

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <Link className="flex items-baseline gap-3 no-underline" href="/">
            <span className="instrument-heading text-3xl leading-none text-[var(--bone)]">
              Treinante
            </span>
            <span className="ui-label hidden sm:inline">Running analytics</span>
          </Link>
          <nav aria-label="Public navigation" className="flex flex-wrap gap-2">
            <Link className={secondaryActionClass} href="/tools">
              Tools
            </Link>
            <Link className={secondaryActionClass} href="/dashboard">
              Dashboard
            </Link>
            {!isLoggedIn ? (
              <Link className={secondaryActionClass} href="/login">
                Log in
              </Link>
            ) : null}
          </nav>
        </header>

        <section className="grid gap-8 pt-6 lg:grid-cols-[7fr_5fr] lg:items-end lg:pt-12">
          <div>
            <p className="ui-label">Demo cockpit · public preview</p>
            <h1 className="instrument-heading mt-4 max-w-5xl text-5xl leading-[0.9] tracking-[-0.04em] text-[var(--primary)] sm:text-7xl lg:text-8xl">
              See the training signal under every run.
            </h1>
          </div>
          <div className="grid gap-5 text-base leading-7 text-[var(--muted-foreground)]">
            <p>
              Treinante turns everyday runs into a readable training cockpit:
              pace trends, effort zones, fitness, fatigue, records, and weekly
              reports for road, trail, track, or mixed training.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link className={actionClass} href={primaryHref}>
                {primaryLabel}
              </Link>
              <Link className={secondaryActionClass} href="/tools">
                Try public tools
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-label="Demo training metrics"
          className="grid gap-3 md:grid-cols-4"
        >
          <Card
            label="Last 30 days"
            value="214.8 km"
            subtitle="Volume across 23 runs"
          />
          <Card
            label="Current form"
            value="+6"
            subtitle="Fresh enough to push"
          />
          <Card
            label="Best trend"
            value="4:52/km"
            subtitle="7-run rolling pace"
          />
          <Card
            label="Load split"
            value="82%"
            subtitle="Easy and steady work"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[5fr_7fr]">
          <Card subtitle="Dummy data preview using the same chart components as the app dashboard.">
            <div className="mb-5">
              <p className="ui-label">Pace + GAP</p>
              <h2 className="instrument-heading mt-2 text-3xl text-[var(--bone)] sm:text-4xl">
                Faster is useful only when you know what changed.
              </h2>
            </div>
            <div className="h-[280px] min-w-0">
              <PaceTrendChart points={pacePoints} />
            </div>
          </Card>

          <Card subtitle="Fitness rises when repeated work becomes sustainable; fatigue warns when the cost is climbing faster.">
            <div className="h-[360px] min-w-0">
              <FitnessPreviewChart points={fitnessPoints} />
            </div>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[7fr_5fr]">
          <Card subtitle="Heart-rate trend lines help separate better fitness from simply running harder.">
            <div className="h-[260px] min-w-0">
              <HrTrendChart maxHr={190} points={hrPoints} />
            </div>
          </Card>

          <div className="grid gap-3">
            {capabilities.map(([label, text]) => (
              <Card key={label} label={label} subtitle={text} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-b border-[var(--border)] py-10 sm:py-14 lg:grid-cols-[7fr_5fr] lg:items-center">
          <div>
            <p className="ui-label">Built for the full loop</p>
            <h2 className="instrument-heading mt-3 max-w-4xl text-4xl leading-none text-[var(--primary)] sm:text-6xl">
              Import, inspect, adjust, repeat.
            </h2>
          </div>
          <div className="grid gap-4 text-sm leading-6 text-[var(--muted-foreground)]">
            <p>
              The app stays opinionated where runners need clarity: one place
              for runs, records, training load, predictions, segments, reports,
              and calculators.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link className={actionClass} href={primaryHref}>
                {primaryLabel}
              </Link>
              {!isLoggedIn ? (
                <Link className={secondaryActionClass} href="/login">
                  Log in
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <footer className="grid gap-5 pb-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="ui-label">Built by hfa</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Links, contact, and project updates.
            </p>
          </div>
          <nav aria-label="Creator links" className="flex flex-wrap gap-2">
            {socialLinks.map(({ href, icon: Icon, label, text }) => (
              <a
                aria-label={label}
                className="inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-[var(--border)] px-3 py-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--bone)] no-underline transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={href}
                key={href}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                target={href.startsWith("http") ? "_blank" : undefined}
              >
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
                {text}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </main>
  );
}
