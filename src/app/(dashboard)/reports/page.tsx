import { generateLastWeekReport } from "@/app/(dashboard)/reports/actions";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/ui";
import { getPreviousWeekStart } from "@/lib/reportEngine";
import { formatDuration, formatPace } from "@/lib/runAnalysis";
import { createServerClient } from "@/lib/supabase-server";
import type { WeeklyReport } from "@/types";

const LIMIT_OPTIONS = [5, 10, 25] as const;
const WEEK_OPTIONS = [4, 8, 12, 26, 52] as const;
const DEFAULT_DESKTOP_LIMIT = 10;
const DEFAULT_MOBILE_LIMIT = 5;
const DEFAULT_WEEKS = 12;

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

function subtractWeeks(date: string, weeks: number) {
  return addDays(date, -(weeks - 1) * 7);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedOption<T extends readonly number[]>(
  value: string | string[] | undefined,
  options: T,
  fallback: T[number]
) {
  const next = Number(firstParam(value));
  return options.includes(next as T[number]) ? (next as T[number]) : fallback;
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

  if (status === "rate_limited") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Report generation is rate limited. Try again later.
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

function ReportControls({
  explicitLimit,
  limit,
  weeks,
}: {
  explicitLimit: boolean;
  limit: number;
  weeks: number;
}) {
  const selectClass =
    "min-h-11 rounded-[2px] border border-[var(--border)] bg-[var(--background)] py-2 pr-8 pl-3 text-[var(--bone)]";
  const mobileLimit = explicitLimit ? limit : DEFAULT_MOBILE_LIMIT;

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <h2 className="font-semibold text-gray-950 dark:text-white">
          Report history
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Select how many reports to show and how far back to look.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <form className="grid grid-cols-2 gap-2 md:hidden">
          <label className="grid gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Show
            <select
              className={selectClass}
              name="limit"
              defaultValue={mobileLimit}
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Period
            <select className={selectClass} name="weeks" defaultValue={weeks}>
              {WEEK_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} weeks
                </option>
              ))}
            </select>
          </label>
          <Button className="col-span-2" type="submit" variant="secondary">
            Apply filters
          </Button>
          {!explicitLimit ? (
            <p className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
              Mobile defaults to {DEFAULT_MOBILE_LIMIT}; desktop defaults to{" "}
              {DEFAULT_DESKTOP_LIMIT}.
            </p>
          ) : null}
        </form>

        <form className="hidden gap-2 md:grid md:grid-cols-[9rem_10rem_auto]">
          <label className="grid gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Show
            <select className={selectClass} name="limit" defaultValue={limit}>
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Period
            <select className={selectClass} name="weeks" defaultValue={weeks}>
              {WEEK_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} weeks
                </option>
              ))}
            </select>
          </label>
          <Button className="self-end" type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </div>
    </div>
  );
}

function ReportDesktopList({ reports }: { reports: WeeklyReport[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--secondary)]">
          <tr>
            <th className="py-2">Week</th>
            <th>Distance</th>
            <th>Runs</th>
            <th>Time</th>
            <th>Avg pace</th>
            <th>Avg HR</th>
            <th>TSB</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {reports.map((report) => {
            const weekEnd = addDays(report.week_start, 6);
            const totalKm = numberValue(report.total_km);
            const totalTime = numberValue(report.total_time);
            const avgPace = numberValue(report.avg_pace);
            const avgHr = nullableNumberValue(report.avg_hr);
            const tsbEnd = nullableNumberValue(report.tsb_end);
            const priorKm =
              report.vs_prev_km_delta === null
                ? null
                : totalKm - numberValue(report.vs_prev_km_delta);
            const kmDelta = formatDelta(report.vs_prev_km_delta, "km");

            return (
              <tr key={report.id} className="align-middle">
                <td className="py-3 font-medium text-[var(--bone)]">
                  Week of {formatDate(report.week_start)} -{" "}
                  {formatDate(weekEnd)}
                </td>
                <td>{formatKm(totalKm)}</td>
                <td>{report.num_runs}</td>
                <td>{formatDuration(totalTime)}</td>
                <td>{formatPace(avgPace)}</td>
                <td>{avgHr !== null ? `${Math.round(avgHr)} bpm` : "-"}</td>
                <td>{tsbEnd !== null ? tsbEnd.toFixed(1) : "-"}</td>
                <td>
                  <span
                    className={`font-medium ${deltaTone(
                      report.vs_prev_km_delta,
                      priorKm
                    )}`}
                  >
                    {deltaLabel(report.vs_prev_km_delta, priorKm)}
                    {kmDelta ? ` ${kmDelta}` : ""}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
  const explicitLimit = firstParam(params.limit) !== undefined;
  const limit = selectedOption(
    params.limit,
    LIMIT_OPTIONS,
    DEFAULT_DESKTOP_LIMIT
  );
  const weeks = selectedOption(params.weeks, WEEK_OPTIONS, DEFAULT_WEEKS);
  const earliestWeekStart = subtractWeeks(previousWeekStart, weeks);
  const [{ data }, previousWeekRuns] = user
    ? await Promise.all([
        supabase
          .from("weekly_reports")
          .select("*")
          .eq("user_id", user.id)
          .gte("week_start", earliestWeekStart)
          .limit(limit)
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
  const mobileReportCount = explicitLimit
    ? reports.length
    : Math.min(reports.length, DEFAULT_MOBILE_LIMIT);
  const previousWeekHadRuns = (previousWeekRuns.count ?? 0) > 0;

  return (
    <PageShell title="Reports">
      <div className="grid gap-4">
        <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
          <h2 className="instrument-heading max-w-5xl text-4xl leading-[0.95] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl lg:text-8xl">
            Every week,{" "}
            <em className="font-normal text-[var(--primary)]">made legible.</em>
          </h2>
        </section>

        <Card subtitle="Weekly summaries are generated automatically after each completed week with at least one run.">
          <form action={generateLastWeekReport} className="mt-4">
            <Button className="w-full sm:w-auto" type="submit">
              Generate last week's report
            </Button>
          </form>
        </Card>

        <ReportNotice status={reportStatus} />

        {!previousWeekHadRuns && reportStatus !== "empty" ? (
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            There were no runs last week, so no report was generated for that
            week.
          </div>
        ) : null}

        <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <ReportControls
            explicitLimit={explicitLimit}
            limit={limit}
            weeks={weeks}
          />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="md:hidden">
              Showing {mobileReportCount} reports from the last {weeks} weeks.
            </span>
            <span className="hidden md:inline">
              Showing {reports.length} reports from the last {weeks} weeks.
            </span>
          </p>

          {reports.length > 0 ? (
            <>
              <ReportDesktopList reports={reports} />
              <div className="grid gap-3 md:hidden">
                {reports.map((report, index) => (
                  <div
                    className={
                      !explicitLimit && index >= DEFAULT_MOBILE_LIMIT
                        ? "hidden"
                        : undefined
                    }
                    key={report.id}
                  >
                    <ReportCard report={report} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No reports match this period yet. Reports are generated
              automatically every Monday after a completed week with runs.
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
