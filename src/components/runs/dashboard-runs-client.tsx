"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  FitnessPreviewChart,
  HrTrendChart,
  PaceTrendChart,
  WeeklyElevationChart,
  WeeklyVolumeChart,
} from "@/components/dashboard/dashboard-charts";
import { Badge, Card } from "@/components/ui";
import { getCachedRuns, upsertCachedRuns } from "@/lib/idb";
import {
  buildDashboardData,
  formatDashboardPace,
} from "@/lib/dashboardAnalysis";
import type { Profile, Run } from "@/types";

function goalColor(status: "green" | "amber" | "red") {
  if (status === "green") return "bg-green-500";
  if (status === "amber") return "bg-amber-500";
  return "bg-red-500";
}

function formVariant(label: string) {
  if (label === "Fresh") return "fresh";
  if (label === "Optimal") return "optimal";
  if (label === "Fatigued") return "fatigued";
  return "overreach";
}

const actionClass =
  "inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
const secondaryActionClass =
  "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 no-underline transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-800";
const ghostActionClass =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 no-underline transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-200 dark:hover:bg-gray-800";

function zoneLabel(
  zone: NonNullable<
    ReturnType<typeof buildDashboardData>["recentRuns"][number]["zone"]
  >
) {
  return zone === "z2" ? "Z2" : zone === "z3" ? "Z3" : "Z4+";
}

export function DashboardRunsClient({
  initialRuns,
  profile,
}: {
  initialRuns: Run[];
  profile: Pick<
    Profile,
    | "id"
    | "name"
    | "weekly_km_goal"
    | "max_hr"
    | "ftp_pace"
    | "strava_connected"
  > | null;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [volumeMode, setVolumeMode] = useState<"km" | "elevation">("km");
  const [showMoreTrends, setShowMoreTrends] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    if (initialRuns.length > 0) {
      void upsertCachedRuns(initialRuns);
    }
    void getCachedRuns(profile.id).then((cachedRuns) => {
      if (cachedRuns.length > 0) setRuns(cachedRuns);
    });
  }, [initialRuns, profile?.id]);

  const dashboard = useMemo(
    () => buildDashboardData(runs, profile),
    [profile, runs]
  );
  const showElevationChart = dashboard.elevationRunCount >= 3;
  const showHrChart = dashboard.hrHistory.length >= 5;
  const hasZoneBreakdown = dashboard.weeklyBuckets.some(
    (bucket) => bucket.zoneKm.z2 + bucket.zoneKm.z3 + bucket.zoneKm.z4 > 0
  );

  if (runs.length === 0) {
    return (
      <Card className="overflow-hidden border-gray-950 bg-gray-950 text-white dark:border-gray-800">
        <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brand-500">
              Empty logbook
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Welcome{profile?.name ? `, ${profile.name}` : ""}.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-gray-300">
              Start by importing a GPX file, connecting Strava, or adding a
              manual run. Trends unlock after a few activities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Link className={actionClass} href="/runs">
              Import GPX
            </Link>
            <Link className={secondaryActionClass} href="/settings">
              Connect Strava
            </Link>
            <Link className={ghostActionClass} href="/runs">
              Add manually
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card
          label="This week"
          value={`${dashboard.summary.currentWeekKm.toFixed(1)} km`}
          subtitle={`of ${dashboard.summary.weeklyGoal.toFixed(0)} km goal`}
        >
          <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full ${goalColor(dashboard.summary.goalStatus)}`}
              style={{
                width: `${Math.max(4, dashboard.summary.weeklyGoalPct)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {dashboard.summary.weeklyGoalPct.toFixed(0)}% complete ·{" "}
            {dashboard.summary.expectedWeekPct.toFixed(0)}% expected
          </p>
        </Card>
        <Card
          label="Last 30 days"
          value={`${dashboard.summary.last30DaysKm.toFixed(1)} km`}
          subtitle="Rolling volume"
        />
        <Card
          label="Total runs"
          value={dashboard.summary.totalRuns}
          subtitle="All time"
        />
        <Card
          label="Current form"
          value={
            dashboard.summary.currentForm
              ? `${dashboard.summary.currentForm.value > 0 ? "+" : ""}${dashboard.summary.currentForm.value}`
              : "-"
          }
          subtitle={
            dashboard.summary.currentForm
              ? "TSB on latest computed run"
              : "Hidden until fitness data exists"
          }
        >
          {dashboard.summary.currentForm ? (
            <Badge
              className="mt-3"
              variant={formVariant(dashboard.summary.currentForm.label)}
            >
              {dashboard.summary.currentForm.label}
            </Badge>
          ) : null}
        </Card>
        <Card
          label="Longest streak"
          value={`${dashboard.summary.longestStreak} days`}
          subtitle="Best consecutive run days"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card subtitle="Last 12 weeks. Click a bar to open that week in the run log.">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Weekly load
            </h2>
            <div className="flex rounded-lg border border-gray-200 p-1 text-xs dark:border-gray-800">
              <button
                className={`rounded-md px-3 py-1 ${volumeMode === "km" ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950" : "text-gray-600 dark:text-gray-300"}`}
                type="button"
                onClick={() => setVolumeMode("km")}
              >
                km
              </button>
              <button
                className={`rounded-md px-3 py-1 ${volumeMode === "elevation" ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950" : "text-gray-600 dark:text-gray-300"}`}
                type="button"
                onClick={() => setVolumeMode("elevation")}
              >
                D+
              </button>
            </div>
          </div>
          <div className="h-[320px]">
            {volumeMode === "elevation" ? (
              showElevationChart ? (
                <WeeklyElevationChart buckets={dashboard.weeklyBuckets} />
              ) : (
                <p className="pt-20 text-center text-sm text-gray-500 dark:text-gray-400">
                  Connect elevation data. This chart appears after 3 runs with
                  D+.
                </p>
              )
            ) : (
              <WeeklyVolumeChart
                buckets={dashboard.weeklyBuckets}
                hasZones={hasZoneBreakdown}
                showElevation={dashboard.hasElevationData}
                weeklyGoal={dashboard.summary.weeklyGoal}
              />
            )}
          </div>
        </Card>

        <Card subtitle="Last 60 days, with GAP when elevation splits exist.">
          <h2 className="font-semibold text-gray-950 dark:text-white">
            Pace trend
          </h2>
          {dashboard.paceHistory.length >= 4 ? (
            <div className="mt-4 h-[320px]">
              <PaceTrendChart points={dashboard.paceHistory} />
            </div>
          ) : (
            <p className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Add more runs to see trends. Charts appear after a few runs.
            </p>
          )}
        </Card>
      </section>

      <button
        className="text-left text-sm font-medium text-brand-600 md:hidden dark:text-brand-400"
        type="button"
        onClick={() => setShowMoreTrends((value) => !value)}
      >
        {showMoreTrends ? "Hide extra trends" : "Show HR and fitness trends"}
      </button>

      <section
        className={`${showMoreTrends ? "grid" : "hidden"} gap-5 md:grid lg:grid-cols-2`}
      >
        {showHrChart ? (
          <Card subtitle="7-run rolling average, last 60 days.">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Heart rate trend
            </h2>
            <div className="mt-4 h-[300px]">
              <HrTrendChart
                points={dashboard.hrHistory}
                maxHr={profile?.max_hr ?? null}
              />
            </div>
          </Card>
        ) : dashboard.hasHrData ? null : (
          <Card subtitle="Connect a heart rate monitor or import from Strava to see HR trends." />
        )}

        <Card subtitle="Compact preview. Full fitness model arrives in PRD 07.">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Fitness preview
            </h2>
            <Link
              className="text-sm text-brand-600 dark:text-brand-400"
              href="/fitness"
            >
              View full fitness chart
            </Link>
          </div>
          {dashboard.fitnessPreview.length > 0 ? (
            <div className="mt-4 h-[300px]">
              <FitnessPreviewChart points={dashboard.fitnessPreview} />
            </div>
          ) : (
            <p className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Keep running. Fitness tracking fills in after 2 weeks.
            </p>
          )}
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <Card subtitle="Your latest five activities.">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Recent runs
            </h2>
            <Link
              className="text-sm text-brand-600 dark:text-brand-400"
              href="/runs"
            >
              View all runs
            </Link>
          </div>
          <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
            {dashboard.recentRuns.map((run) => (
              <Link
                className="grid grid-cols-2 gap-2 py-3 text-sm no-underline sm:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.5fr_0.6fr] sm:items-center"
                href={`/runs/${run.id}`}
                key={run.id}
              >
                <span className="font-medium text-gray-950 dark:text-white">
                  {run.date.slice(5)}
                </span>
                <span>{run.distance.toFixed(1)} km</span>
                <span>{formatDashboardPace(run.avg_pace)}</span>
                {dashboard.hasElevationData ? (
                  <span>
                    {run.elevation_gain
                      ? `${run.elevation_gain.toFixed(0)} m D+`
                      : "-"}
                  </span>
                ) : null}
                <span>
                  {run.zone ? (
                    <Badge variant={run.zone}>{zoneLabel(run.zone)}</Badge>
                  ) : (
                    ""
                  )}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {run.source.toUpperCase()}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card subtitle="Fast paths into the existing import and sync flows.">
          <h2 className="font-semibold text-gray-950 dark:text-white">
            Quick actions
          </h2>
          <div className="mt-4 grid gap-2">
            <Link className={actionClass} href="/runs">
              Import GPX
            </Link>
            <Link className={secondaryActionClass} href="/settings">
              {profile?.strava_connected ? "Sync Strava" : "Connect Strava"}
            </Link>
            <Link className={ghostActionClass} href="/runs">
              Add manual run
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
