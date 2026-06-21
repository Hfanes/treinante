import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { RunSplitsChart } from "@/components/runs/run-splits-chart";
import { Badge, Card } from "@/components/ui";
import {
  analyzeRun,
  formatDuration,
  formatPace,
  type CardiacDrift,
} from "@/lib/runAnalysis";
import { countTrainingDays } from "@/lib/calculations";
import { createServerClient } from "@/lib/supabase-server";
import type { Profile, Run } from "@/types";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function sourceLabel(source: Run["source"]) {
  return source === "gpx" ? "GPX" : source === "strava" ? "Strava" : "Manual";
}

function zoneLabel(zone: RunAnalysisZone) {
  return zone === "z2" ? "Z2" : zone === "z3" ? "Z3" : "Z4+";
}

function formatElevationDelta(value: number | null) {
  if (value === null) return "-";
  if (Math.round(value) === 0) return "0 m";
  return `${value > 0 ? "+" : ""}${Math.round(value)} m`;
}

type RunAnalysisZone = NonNullable<ReturnType<typeof analyzeRun>["zone"]>;

function driftCopy(drift: CardiacDrift) {
  const signed = drift.drift > 0 ? `+${drift.drift}` : String(drift.drift);
  if (drift.severity === "very_high") {
    return {
      className:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
      text: `Cardiac drift detected (${signed} bpm). Strong signal to review hydration, pacing, or heat stress.`,
    };
  }
  if (drift.severity === "high") {
    return {
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
      text: `Cardiac drift detected (${signed} bpm). Consider hydration or pacing.`,
    };
  }
  if (drift.severity === "moderate") {
    return {
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
      text: `Mild cardiac drift: ${signed} bpm.`,
    };
  }
  return {
    className:
      "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300",
    text: `HR drift: ${signed} bpm.`,
  };
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const [{ data: run }, { data: profile }, { data: runDates }] =
    await Promise.all([
      supabase.from("runs").select("*").eq("id", id).single(),
      supabase
        .from("profiles")
        .select("max_hr,lthr,hr_zone_method,ftp_pace")
        .single(),
      supabase.from("runs").select("date"),
    ]);

  if (!run) notFound();

  const typedRun = run as unknown as Run;
  const typedProfile = profile as Pick<
    Profile,
    "max_hr" | "lthr" | "hr_zone_method" | "ftp_pace"
  > | null;
  const analysis = analyzeRun(typedRun, typedProfile);
  const hasElevation =
    typedRun.elevation_gain >= 10 ||
    analysis.splits.some((split) => split.elevation > 0);
  const showMovingTime =
    Math.abs(typedRun.total_time - typedRun.moving_time) > 30;
  const drift = analysis.cardiacDrift ? driftCopy(analysis.cardiacDrift) : null;
  const hasStopFlags = analysis.splits.some((split) => split.is_stop);
  const trainingDays = countTrainingDays(
    (runDates ?? []) as Pick<Run, "date">[]
  );

  return (
    <PageShell title={typedRun.title ?? "Run detail"}>
      <div className="grid gap-4">
        <div>
          <Link
            className="text-sm text-brand-600 hover:underline dark:text-brand-400"
            href="/runs"
          >
            Back to runs
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(typedRun.date)} · {typedRun.distance.toFixed(1)} km
            </span>
            <Badge variant={typedRun.source}>
              {sourceLabel(typedRun.source)}
            </Badge>
            {analysis.zone ? (
              <Badge variant={analysis.zone}>{zoneLabel(analysis.zone)}</Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Distance" value={`${typedRun.distance.toFixed(1)} km`} />
          <Card
            label="Total time"
            value={formatDuration(typedRun.total_time)}
          />
          <Card label="Avg pace" value={formatPace(typedRun.avg_pace)} />
          {showMovingTime ? (
            <Card
              label="Moving time"
              value={formatDuration(typedRun.moving_time)}
            />
          ) : null}
          {typedRun.avg_hr !== null ? (
            <Card label="Avg HR" value={`${typedRun.avg_hr} bpm`} />
          ) : null}
          {typedRun.max_hr !== null ? (
            <Card label="Max HR" value={`${typedRun.max_hr} bpm`} />
          ) : null}
          {analysis.zone ? (
            <Card label="Effort zone" value={zoneLabel(analysis.zone)} />
          ) : null}
          {hasElevation ? (
            <Card
              label="D+"
              value={`${typedRun.elevation_gain.toFixed(0)} m`}
            />
          ) : null}
          {hasElevation ? (
            <Card
              label="D-"
              value={`${typedRun.elevation_loss.toFixed(0)} m`}
            />
          ) : null}
          {analysis.dPlusPerKm !== null ? (
            <Card
              label="D+/km"
              value={`${analysis.dPlusPerKm.toFixed(1)} m/km`}
            />
          ) : null}
          {analysis.wholeRunGap !== null ? (
            <Card label="GAP" value={formatPace(analysis.wholeRunGap)} />
          ) : null}
          {typedRun.tsb_at_date !== null && trainingDays >= 7 ? (
            <Card label="TSB on day" value={Math.round(typedRun.tsb_at_date)} />
          ) : null}
        </div>

        {drift ? (
          <div className={`rounded-xl border p-3 text-sm ${drift.className}`}>
            {drift.text}
          </div>
        ) : null}
        {analysis.stopCount > 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
            {analysis.stopCount} {analysis.stopCount === 1 ? "stop" : "stops"}{" "}
            detected.
            {analysis.stopRatio > 0.2
              ? " High pace variance; run may include paused time not excluded from splits."
              : ""}
          </div>
        ) : null}

        {analysis.splits.length > 0 ? (
          <Card subtitle="Per-km pace, GAP, heart rate, elevation, and stop highlighting.">
            <div className="mt-4">
              <RunSplitsChart splits={analysis.splits} />
            </div>
          </Card>
        ) : (
          <Card subtitle="Import a GPX file for full split analysis: pace, HR, elevation, and more.">
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              This manual run has summary metrics only.
            </p>
          </Card>
        )}

        {analysis.wholeRunGap !== null &&
        analysis.flatEquivalentDistance !== null ? (
          <Card>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Flat-equivalent distance:{" "}
              <strong>{analysis.flatEquivalentDistance.toFixed(1)} km</strong>{" "}
              at your GAP pace of {formatPace(analysis.wholeRunGap)}; adjusted
              for {typedRun.elevation_gain.toFixed(0)} m D+.
            </p>
          </Card>
        ) : null}

        {analysis.splits.length > 0 ? (
          <details className="rounded-[2px] border border-[var(--border)] bg-[var(--card)] p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-medium text-[var(--bone)]">
              Per-km splits table
            </summary>
            <div className="mt-4 grid gap-3 md:hidden">
              {analysis.splits.map((split) => (
                <article
                  className={`rounded-[2px] border border-[var(--border)] p-3 ${split.is_stop ? "bg-[var(--muted)]" : "bg-[color-mix(in_oklch,var(--card)_92%,black)]"}`}
                  key={split.km}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="ui-label">Kilometer</p>
                      <p className="mt-1 font-mono text-lg text-[var(--bone)]">
                        {split.km}
                      </p>
                    </div>
                    {split.is_stop ? (
                      <Badge variant="neutral">Stop flag</Badge>
                    ) : null}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="ui-label">Pace</dt>
                      <dd className="mt-1 font-mono text-[var(--bone)]">
                        {formatPace(split.pace)}
                      </dd>
                    </div>
                    <div>
                      <dt className="ui-label">GAP</dt>
                      <dd className="mt-1 font-mono text-[var(--bone)]">
                        {split.gap ? formatPace(split.gap) : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="ui-label">HR</dt>
                      <dd className="mt-1 font-mono text-[var(--bone)]">
                        {split.hr ? `${split.hr} bpm` : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="ui-label">Elevation</dt>
                      <dd className="mt-1 font-mono text-[var(--bone)]">
                        {split.elevation ? `${split.elevation} m` : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="ui-label">D+/-</dt>
                      <dd className="mt-1 font-mono text-[var(--bone)]">
                        {formatElevationDelta(split.elevationDelta)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-2">km</th>
                    <th>Pace</th>
                    <th>GAP</th>
                    <th>HR</th>
                    <th>Elevation</th>
                    <th>D+/-</th>
                    {hasStopFlags ? <th>Flag</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {analysis.splits.map((split) => (
                    <tr
                      key={split.km}
                      className={
                        split.is_stop
                          ? "bg-gray-100 dark:bg-gray-950"
                          : undefined
                      }
                    >
                      <td className="py-3 font-medium">{split.km}</td>
                      <td>{formatPace(split.pace)}</td>
                      <td>{split.gap ? formatPace(split.gap) : "-"}</td>
                      <td>{split.hr ? `${split.hr} bpm` : "-"}</td>
                      <td>{split.elevation ? `${split.elevation} m` : "-"}</td>
                      <td>{formatElevationDelta(split.elevationDelta)}</td>
                      {hasStopFlags ? (
                        <td>{split.is_stop ? "Possible stop" : ""}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </div>
    </PageShell>
  );
}
