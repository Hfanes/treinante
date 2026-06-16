import { generateLastWeekReport } from "@/app/(dashboard)/reports/actions";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/ui";
import { getPreviousWeekStart } from "@/lib/reportEngine";
import { formatDuration, formatPace } from "@/lib/runAnalysis";
import { createServerClient } from "@/lib/supabase-server";
import type { WeeklyReport } from "@/types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatKm(value: number) {
  return `${numberValue(value).toFixed(1).replace(/\.0$/, "")} km`;
}

function numberValue(value: unknown, fallback = 0) {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function nullableNumberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const next = numberValue(value, Number.NaN);
  return Number.isFinite(next) ? next : null;
}

function formatDelta(value: number | null, unit: "km" | "m" | "time") {
  const next = nullableNumberValue(value);
  if (next === null) return null;
  if (unit === "time") {
    return `${next >= 0 ? "+" : "-"}${formatDuration(Math.abs(next))}`;
  }
  return `${next >= 0 ? "+" : ""}${Math.round(next * 10) / 10} ${unit}`;
}

function deltaTone(value: number | null, baseline: number | null) {
  const next = nullableNumberValue(value);
  const base = nullableNumberValue(baseline);

  if (next === null || base === null || base === 0) {
    return "text-gray-500 dark:text-gray-400";
  }

  const ratio = Math.abs(next) / base;
  if (ratio < 0.05) return "text-gray-500 dark:text-gray-400";
  return next > 0
    ? "text-green-700 dark:text-green-400"
    : "text-red-700 dark:text-red-400";
}

function deltaLabel(value: number | null, baseline: number | null) {
  const next = nullableNumberValue(value);
  const base = nullableNumberValue(baseline);

  if (next === null || base === null || base === 0) return "No prior week";
  if (Math.abs(next) / base < 0.05) return "Stable";
  return next > 0 ? "Up" : "Down";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold text-gray-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function ReportNotice({ status }: { status: string | undefined }) {
  if (status === "generated") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
        Last week's report was generated.
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        There were no runs last week, so no report was generated.
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Report generation failed. Try again after refreshing the page.
      </div>
    );
  }

  return null;
}

function ZoneBar({ report }: { report: WeeklyReport }) {
  if (!report.zone_breakdown) return null;
  const z2 = numberValue(report.zone_breakdown.z2);
  const z3 = numberValue(report.zone_breakdown.z3);
  const z4 = numberValue(report.zone_breakdown.z4);

  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Zone breakdown
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="bg-zone2" style={{ width: `${z2}%` }} />
        <div className="bg-zone3" style={{ width: `${z3}%` }} />
        <div className="bg-zone4" style={{ width: `${z4}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-600 dark:text-gray-300">
        <span>Z2 {z2}%</span>
        <span>Z3 {z3}%</span>
        <span>Z4 {z4}%</span>
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: WeeklyReport }) {
  const weekEnd = addDays(report.week_start, 6);
  const kmDelta = formatDelta(report.vs_prev_km_delta, "km");
  const dPlusDelta = formatDelta(report.vs_prev_d_plus_delta, "m");
  const timeDelta = formatDelta(report.vs_prev_time_delta, "time");
  const totalKm = numberValue(report.total_km);
  const totalDPlus = nullableNumberValue(report.total_d_plus);
  const totalTime = numberValue(report.total_time);
  const avgPace = numberValue(report.avg_pace);
  const avgHr = nullableNumberValue(report.avg_hr);
  const ctlEnd = nullableNumberValue(report.ctl_end);
  const atlEnd = nullableNumberValue(report.atl_end);
  const tsbEnd = nullableNumberValue(report.tsb_end);
  const priorKm =
    report.vs_prev_km_delta === null
      ? null
      : totalKm - numberValue(report.vs_prev_km_delta);

  return (
    <details className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm open:ring-2 open:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900">
      <summary className="flex cursor-pointer list-none flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-gray-950 dark:text-white">
            Week of {formatDate(report.week_start)} - {formatDate(weekEnd)}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {formatKm(totalKm)} · {report.num_runs} runs
            {tsbEnd !== null
              ? ` · TSB ${tsbEnd > 0 ? "+" : ""}${Math.round(tsbEnd)}`
              : ""}
          </div>
        </div>
        <div
          className={`text-sm font-medium ${deltaTone(report.vs_prev_km_delta, priorKm)}`}
        >
          {deltaLabel(report.vs_prev_km_delta, priorKm)}
          {kmDelta ? ` ${kmDelta}` : ""}
        </div>
      </summary>

      <div className="mt-5 grid gap-5 border-t border-gray-200 pt-5 dark:border-gray-800">
        {report.insight_text ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
            {report.insight_text}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Distance" value={formatKm(totalKm)} />
          <Stat label="Runs" value={report.num_runs} />
          <Stat label="Time" value={formatDuration(totalTime)} />
          <Stat label="Avg pace" value={formatPace(avgPace)} />
          {totalDPlus !== null ? (
            <Stat label="Elevation" value={`${Math.round(totalDPlus)} m`} />
          ) : null}
          {avgHr !== null ? (
            <Stat label="Avg HR" value={`${Math.round(avgHr)} bpm`} />
          ) : null}
          {ctlEnd !== null ? (
            <Stat label="CTL end" value={ctlEnd.toFixed(1)} />
          ) : null}
          {atlEnd !== null ? (
            <Stat label="ATL end" value={atlEnd.toFixed(1)} />
          ) : null}
          {tsbEnd !== null ? (
            <Stat label="TSB end" value={tsbEnd.toFixed(1)} />
          ) : null}
        </div>

        <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-3">
          {kmDelta ? <div>Distance vs prior week: {kmDelta}</div> : null}
          {dPlusDelta ? <div>Elevation vs prior week: {dPlusDelta}</div> : null}
          {timeDelta ? <div>Time vs prior week: {timeDelta}</div> : null}
        </div>

        <ZoneBar report={report} />
      </div>
    </details>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const previousWeekStart = getPreviousWeekStart();
  const previousWeekEnd = addDays(previousWeekStart, 6);
  const params = (await searchParams) ?? {};
  const reportStatus = firstParam(params.report);
  const [{ data }, previousWeekRuns] = user
    ? await Promise.all([
        supabase
          .from("weekly_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false }),
        supabase
          .from("runs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("date", previousWeekStart)
          .lte("date", previousWeekEnd),
      ])
    : [{ data: [] }, { count: 0 }];
  const reports = (data ?? []) as unknown as WeeklyReport[];
  const previousWeekHadRuns = (previousWeekRuns.count ?? 0) > 0;

  return (
    <PageShell title="Reports">
      <div className="grid gap-4">
        <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
          <h2 className="instrument-heading max-w-5xl text-6xl leading-[0.92] tracking-[-0.03em] text-[var(--primary)] sm:text-7xl lg:text-8xl">
            Every week,{" "}
            <em className="font-normal text-[var(--primary)]">made legible.</em>
          </h2>
        </section>

        <Card subtitle="Weekly summaries are generated automatically after each completed week with at least one run.">
          <form action={generateLastWeekReport} className="mt-4">
            <Button type="submit">Generate last week's report</Button>
          </form>
        </Card>

        <ReportNotice status={reportStatus} />

        {!previousWeekHadRuns && reportStatus !== "empty" ? (
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            There were no runs last week, so no report was generated for that
            week.
          </div>
        ) : null}

        {reports.length > 0 ? (
          <div className="grid gap-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <Card subtitle="Reports are generated automatically every Monday after your first full week of running. Come back then to see your summary." />
        )}
      </div>
    </PageShell>
  );
}
