import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Badge, Card } from "@/components/ui";
import { recalculatePersonalRecords } from "@/lib/prExtractor";
import { formatDuration } from "@/lib/runAnalysis";
import { createServerClient } from "@/lib/supabase-server";
import type { PersonalRecord, PersonalRecordType, Run } from "@/types";

const TIME_RECORDS: Array<{
  type: PersonalRecordType;
  label: string;
  km: number;
}> = [
  { type: "1k", label: "1 km", km: 1 },
  { type: "5k", label: "5 km", km: 5 },
  { type: "10k", label: "10 km", km: 10 },
  { type: "21k", label: "Half marathon", km: 21 },
  { type: "42k", label: "Marathon", km: 42 },
];

const DISTANCE_RECORDS: Array<{
  type: PersonalRecordType;
  label: string;
  format: (value: number) => string;
}> = [
  {
    type: "longest_run",
    label: "Longest run",
    format: (value) => `${value.toFixed(1)} km`,
  },
  {
    type: "most_elevation",
    label: "Most elevation",
    format: (value) => `${value.toFixed(0)} m D+`,
  },
  {
    type: "best_d_plus_per_km",
    label: "Best D+/km",
    format: (value) => `${value.toFixed(1)} m/km`,
  },
];

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default async function RecordsPage() {
  const supabase = await createServerClient();
  const [
    {
      data: { user },
    },
    { data: records },
    { data: runs },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("personal_records").select("*").order("type"),
    supabase.from("runs").select("*").order("date", { ascending: false }),
  ]);
  let personalRecords = (records ?? []) as unknown as PersonalRecord[];
  const typedRuns = (runs ?? []) as unknown as Run[];

  if (user && personalRecords.length === 0 && typedRuns.length > 0) {
    personalRecords = await recalculatePersonalRecords(supabase, user.id);
  }

  const runMap = new Map(
    typedRuns.map((run) => [run.id, run])
  );
  const byType = new Map(
    personalRecords.map((record) => [record.type, record])
  );
  const timeRecords = TIME_RECORDS.map((config) => ({
    ...config,
    record: byType.get(config.type),
  })).filter((item) => item.record);
  const distanceRecords = DISTANCE_RECORDS.map((config) => ({
    ...config,
    record: byType.get(config.type),
  })).filter((item) => item.record);

  return (
    <PageShell title="Records">
      <div className="grid gap-5">
        {personalRecords.length === 0 ? (
          <Card subtitle="Import GPX or Strava runs with split data to unlock time records. Manual runs still count for longest run and elevation bests.">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No personal records yet.
            </p>
          </Card>
        ) : null}

        {timeRecords.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {timeRecords.map(({ type, label, km, record }) => {
              if (!record) return null;
              const run = record.run_id ? runMap.get(record.run_id) : null;
              const estimated = Boolean(run && run.distance < km);
              const value = `${estimated ? "~" : ""}${formatDuration(record.value)}`;

              return (
                <Card
                  key={type}
                  label={label}
                  value={value}
                  subtitle={`${formatDate(record.achieved_at)}${estimated && run ? ` · estimated from ${run.distance.toFixed(1)} km` : ""}`}
                >
                  <div className="mt-3 flex items-center gap-2">
                    {estimated ? (
                      <Badge variant="neutral">Estimated</Badge>
                    ) : null}
                    {run ? (
                      <Link
                        className="text-sm text-brand-600 dark:text-brand-400"
                        href={`/runs/${run.id}`}
                      >
                        Open run
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </section>
        ) : null}

        {timeRecords.length > 0 ? (
          <Card subtitle="Progression timelines need historical PR events. The current schema stores the latest best per record type only.">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              PR timeline
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Run more and future PR history storage will show each improvement
              over time.
            </p>
          </Card>
        ) : null}

        {distanceRecords.length > 0 ? (
          <Card subtitle="Single-run bests across distance and climbing.">
            <h2 className="font-semibold text-gray-950 dark:text-white">
              Distance bests
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-2">Best</th>
                    <th>Value</th>
                    <th>Date</th>
                    <th>Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {distanceRecords.map(({ type, label, format, record }) => {
                    if (!record) return null;
                    const run = record.run_id
                      ? runMap.get(record.run_id)
                      : null;
                    return (
                      <tr key={type}>
                        <td className="py-3 font-medium text-gray-950 dark:text-white">
                          {label}
                        </td>
                        <td>{format(record.value)}</td>
                        <td>{formatDate(record.achieved_at)}</td>
                        <td>
                          {run ? (
                            <Link
                              className="text-brand-600 dark:text-brand-400"
                              href={`/runs/${run.id}`}
                            >
                              Open
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
