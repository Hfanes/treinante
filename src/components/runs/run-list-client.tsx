"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge, Button, Card } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useRuns } from "@/hooks/useRuns";
import { upsertCachedRuns } from "@/lib/idb";
import { parseGPX } from "@/lib/gpxParser";
import {
  buildPrBadgeMap,
  formatPrBadgeLabel,
  type PersonalRecordBadgeRecord,
} from "@/lib/personalRecordLabels";
import { analyzeRun } from "@/lib/runAnalysis";
import { createBrowserClient } from "@/lib/supabase";
import type { Run, RunDraft, RunSource } from "@/types";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

type SortKey =
  | "date"
  | "distance"
  | "moving_time"
  | "avg_pace"
  | "avg_hr"
  | "elevation_gain";

interface PendingGpx {
  id: string;
  file: File;
  draft: RunDraft;
}

function formatKm(value: number) {
  return `${value.toFixed(1)} km`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPace(seconds: number) {
  return `${formatDuration(seconds)}/km`;
}

type RunAnalysisZone = NonNullable<ReturnType<typeof analyzeRun>["zone"]>;

function zoneLabel(zone: RunAnalysisZone) {
  return zone === "z2" ? "Z2" : zone === "z3" ? "Z3" : "Z4";
}

function splitPaceBars(run: Run) {
  const splitPaces = run.raw_splits
    .map((split) => split.pace)
    .filter((pace) => Number.isFinite(pace) && pace > 0);

  if (splitPaces.length === 0) return [];

  if (splitPaces.length <= 24) return splitPaces;

  return Array.from({ length: 24 }, (_, index) => {
    const start = Math.floor((index * splitPaces.length) / 24);
    const end = Math.floor(((index + 1) * splitPaces.length) / 24);
    const bucket = splitPaces.slice(start, Math.max(start + 1, end));

    return bucket.reduce((sum, pace) => sum + pace, 0) / bucket.length;
  });
}

function SplitsSparkline({ run }: { run: Run }) {
  const bars = splitPaceBars(run);

  if (bars.length === 0) return <span>-</span>;

  const minPace = Math.min(...bars);
  const maxPace = Math.max(...bars);
  const range = Math.max(1, maxPace - minPace);

  return (
    <div
      aria-label={`${run.raw_splits.length} splits`}
      className="flex h-10 w-28 items-end gap-0.5"
      role="img"
    >
      {bars.map((pace, index) => {
        const height = 28 + ((pace - minPace) / range) * 72;

        return (
          <span
            aria-hidden="true"
            className="flex-1 bg-[#d8bd8a] opacity-90"
            key={`${run.id}-split-${index}`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

function createRun(userId: string, draft: RunDraft): Run {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: now,
    updated_at: now,
    ...draft,
  };
}

function parseTimeToSeconds(value: string) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function PrBadge({ label }: { label: string }) {
  return (
    <span
      aria-label="Current personal record"
      className="inline-flex items-center gap-1 rounded-[2px] border border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--primary)]"
    >
      <span aria-hidden="true">★</span>
      {label}
    </span>
  );
}

function MobileRunCard({
  onDelete,
  prBadgeLabel,
  run,
  showElevation,
  zone,
}: {
  onDelete: (run: Run) => void;
  prBadgeLabel: string | null;
  run: Run;
  showElevation: boolean;
  zone: RunAnalysisZone | null;
}) {
  return (
    <article className="rounded-[2px] border border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_92%,black)] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0 overflow-hidden">
          <a
            className="block max-w-full truncate font-medium text-[var(--bone)] no-underline"
            href={`/runs/${run.id}`}
            title={run.title ?? "Untitled run"}
          >
            {run.title ?? "Untitled run"}
          </a>
          <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {run.date} · {run.source.toUpperCase()}
          </p>
        </div>
        {zone ? (
          <span className="shrink-0">
            <Badge variant={zone}>{zoneLabel(zone)}</Badge>
          </span>
        ) : null}
      </div>

      {prBadgeLabel ? (
        <div className="mt-3">
          <PrBadge label={prBadgeLabel} />
        </div>
      ) : null}

      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="ui-label">Distance</dt>
          <dd className="mt-1 font-mono text-[var(--bone)]">
            {formatKm(run.distance)}
          </dd>
        </div>
        <div>
          <dt className="ui-label">Time</dt>
          <dd className="mt-1 font-mono text-[var(--bone)]">
            {formatDuration(run.moving_time)}
          </dd>
        </div>
        <div>
          <dt className="ui-label">Pace</dt>
          <dd className="mt-1 font-mono text-[var(--bone)]">
            {formatPace(run.avg_pace)}
          </dd>
        </div>
        <div>
          <dt className="ui-label">Avg HR</dt>
          <dd className="mt-1 font-mono text-[var(--bone)]">
            {run.avg_hr ? `${run.avg_hr} bpm` : "-"}
          </dd>
        </div>
        {showElevation ? (
          <div>
            <dt className="ui-label">D+</dt>
            <dd className="mt-1 font-mono text-[var(--bone)]">
              {run.elevation_gain.toFixed(0)} m
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="ui-label">Splits</dt>
          <dd className="mt-1 max-w-full overflow-hidden">
            <SplitsSparkline run={run} />
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <a
          className="text-sm text-[var(--primary)] no-underline"
          href={`/runs/${run.id}`}
        >
          Open details
        </a>
        <Button type="button" variant="ghost" onClick={() => onDelete(run)}>
          Delete
        </Button>
      </div>
    </article>
  );
}

function RunsLibraryHero() {
  return (
    <section className="overflow-hidden py-6 sm:py-8 lg:py-10">
      <h2 className="instrument-heading max-w-5xl text-4xl leading-[0.95] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl lg:text-8xl">
        Every run.{" "}
        <em className="font-normal text-[var(--primary)]">Every split.</em>
      </h2>
    </section>
  );
}

export function RunListClient({
  currentPrRecords,
  initialRuns,
}: {
  currentPrRecords: PersonalRecordBadgeRecord[];
  initialRuns: Run[];
}) {
  const { profile, user } = useAuth();
  const { runs, addRun, deleteRun, loading, syncRuns } = useRuns();
  const [pendingGpx, setPendingGpx] = useState<PendingGpx[]>([]);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<RunSource | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [manualDistance, setManualDistance] = useState("");
  const [manualTotalTime, setManualTotalTime] = useState("");
  const [manualMovingTime, setManualMovingTime] = useState("");
  const [manualAvgHr, setManualAvgHr] = useState("");
  const [manualMaxHr, setManualMaxHr] = useState("");
  const [manualElevationGain, setManualElevationGain] = useState("");
  const [manualElevationLoss, setManualElevationLoss] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  useEffect(() => {
    if (initialRuns.length > 0) {
      void upsertCachedRuns(initialRuns);
    }
  }, [initialRuns]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDateFrom(params.get("dateFrom") ?? "");
    setDateTo(params.get("dateTo") ?? "");
    setPageSize(window.matchMedia("(max-width: 639px)").matches ? 5 : 10);
  }, []);

  useEffect(() => {
    if (!pageSizeOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!pageSizeRef.current?.contains(event.target as Node)) {
        setPageSizeOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [pageSizeOpen]);

  const displayRuns = runs.length > 0 || !loading ? runs : initialRuns;
  const stravaConnected = profile?.strava_connected ?? false;
  const currentPrBadgeMap = useMemo(
    () => buildPrBadgeMap(currentPrRecords),
    [currentPrRecords]
  );
  const showElevation = displayRuns.some((run) => run.elevation_gain > 0);
  const filteredRuns = useMemo(() => {
    return [...displayRuns]
      .filter((run) => sourceFilter === "all" || run.source === sourceFilter)
      .filter((run) => !dateFrom || run.date >= dateFrom)
      .filter((run) => !dateTo || run.date <= dateTo)
      .sort((a, b) => {
        if (sortKey === "date") return b.date.localeCompare(a.date);
        const aValue = a[sortKey] ?? -1;
        const bValue = b[sortKey] ?? -1;
        return Number(bValue) - Number(aValue);
      });
  }, [dateFrom, dateTo, displayRuns, sortKey, sourceFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const filteredTotals = useMemo(
    () => ({
      distance: filteredRuns.reduce((sum, run) => sum + run.distance, 0),
      elevation: filteredRuns.reduce((sum, run) => sum + run.elevation_gain, 0),
    }),
    [filteredRuns]
  );
  const visibleRuns = filteredRuns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, pageSize, sortKey, sourceFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  async function handleGpxFiles(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setMessage(null);
    const files = [...(event.target.files ?? [])];
    const previews: PendingGpx[] = [];

    for (const file of files) {
      try {
        previews.push({
          id: crypto.randomUUID(),
          file,
          draft: parseGPX(await file.text()),
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `Could not parse ${file.name}`
        );
      }
    }

    setPendingGpx(previews);
    event.target.value = "";
  }

  function connectStrava() {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) {
      setError("Missing Strava client id.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/strava/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "activity:read_all",
    });

    window.location.assign(`https://www.strava.com/oauth/authorize?${params}`);
  }

  async function handleStravaSync() {
    if (!stravaConnected) {
      connectStrava();
      return;
    }

    setStravaSyncing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/strava/sync", { method: "POST" });
      const body = (await response.json()) as {
        imported?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          body.error ?? `Strava sync failed with ${response.status}`
        );
      }

      await syncRuns();
      setMessage(`Synced ${body.imported ?? 0} new Strava runs.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync Strava.");
    } finally {
      setStravaSyncing(false);
    }
  }

  async function confirmGpxImport() {
    if (!user) {
      setError("Sign in before importing GPX files.");
      return;
    }

    setError(null);
    setMessage(null);
    const supabase = createBrowserClient();
    let imported = 0;

    try {
      for (const item of pendingGpx) {
        const run = createRun(user.id, item.draft);
        const path = `${user.id}/${run.id}.gpx`;
        const { error: uploadError } = await supabase.storage
          .from("gpx")
          .upload(path, item.file, {
            contentType: "application/gpx+xml",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        await addRun({ ...run, gpx_file_url: path });
        imported += 1;
      }

      setPendingGpx([]);
      setMessage(
        `Imported ${imported} GPX ${imported === 1 ? "run" : "runs"}.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not import GPX file."
      );
    }
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError("Sign in before adding runs.");
      return;
    }

    const distance = Number(manualDistance);
    const totalTime = parseTimeToSeconds(manualTotalTime);
    const movingTime = manualMovingTime
      ? parseTimeToSeconds(manualMovingTime)
      : totalTime;

    if (
      !Number.isFinite(distance) ||
      distance <= 0 ||
      !totalTime ||
      !movingTime
    ) {
      setError("Distance and time must be valid positive values.");
      return;
    }

    const optionalNumber = (value: string) => {
      if (!value.trim()) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const draft: RunDraft = {
      title: manualTitle.trim() || "Manual run",
      date: manualDate,
      start_time: null,
      source: "manual",
      sport_type: "Run",
      strava_activity_id: null,
      distance,
      total_time: totalTime,
      moving_time: movingTime,
      avg_hr: optionalNumber(manualAvgHr),
      max_hr: optionalNumber(manualMaxHr),
      avg_power: null,
      max_power: null,
      elevation_gain: optionalNumber(manualElevationGain) ?? 0,
      elevation_loss: optionalNumber(manualElevationLoss) ?? 0,
      avg_pace: Math.round(movingTime / distance),
      start_lat: null,
      start_lng: null,
      end_lat: null,
      end_lng: null,
      summary_polyline: null,
      gpx_file_url: null,
      raw_splits: [],
      raw_source: { notes: manualNotes.trim() || null },
      training_load: null,
      ctl_at_date: null,
      atl_at_date: null,
      tsb_at_date: null,
    };

    try {
      await addRun(createRun(user.id, draft));
      setManualTitle("");
      setManualDistance("");
      setManualTotalTime("");
      setManualMovingTime("");
      setManualAvgHr("");
      setManualMaxHr("");
      setManualElevationGain("");
      setManualElevationLoss("");
      setManualNotes("");
      setManualOpen(false);
      setMessage("Manual run added.");
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not add manual run."
      );
    }
  }

  async function handleDelete(run: Run) {
    if (!window.confirm(`Delete ${run.title ?? "this run"}?`)) return;
    try {
      await deleteRun(run.id);
      setMessage("Run deleted.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete run.");
    }
  }

  return (
    <div className="grid gap-4">
      <RunsLibraryHero />

      <Card className="vbars overflow-hidden bg-[color-mix(in_oklch,var(--background)_78%,black)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="ui-label">Import desk</div>
            <h2 className="instrument-heading mt-2 text-4xl">
              Load real training data.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Drop GPX files for full GPS analysis, or add a clean manual run
              when only distance and time exist.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[2px] border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90">
              Import GPX
              <input
                className="sr-only"
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                multiple
                onChange={handleGpxFiles}
              />
            </label>
            <Button
              className="w-full sm:w-auto"
              type="button"
              disabled={stravaSyncing}
              onClick={() => void handleStravaSync()}
            >
              {stravaConnected
                ? stravaSyncing
                  ? "Syncing Strava..."
                  : "Sync Strava"
                : "Connect Strava"}
            </Button>
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="secondary"
              onClick={() => setManualOpen((open) => !open)}
            >
              Add manual run
            </Button>
          </div>
        </div>
      </Card>

      {message ? (
        <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {pendingGpx.length > 0 ? (
        <Card subtitle="Review parsed files before saving them to your run history.">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pendingGpx.map((item) => (
              <div
                key={item.id}
                className="rounded-[2px] border border-[var(--border)] p-3"
              >
                <p className="font-medium text-[var(--bone)]">
                  {item.draft.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatKm(item.draft.distance)} ·{" "}
                  {formatDuration(item.draft.moving_time)} · D+{" "}
                  {item.draft.elevation_gain.toFixed(0)} m
                </p>
                {item.draft.raw_source.warning ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {String(item.draft.raw_source.warning)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={confirmGpxImport}>
              Confirm import
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingGpx([])}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {manualOpen ? (
        <Card subtitle="Manual runs skip split, GAP, and GPS-based analysis until richer data is imported.">
          <form
            className="mt-4 grid gap-3 md:grid-cols-4"
            onSubmit={handleManualSubmit}
          >
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              placeholder="Title"
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              type="date"
              required
              value={manualDate}
              onChange={(event) => setManualDate(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Distance km"
              value={manualDistance}
              onChange={(event) => setManualDistance(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              required
              placeholder="Total HH:MM:SS"
              value={manualTotalTime}
              onChange={(event) => setManualTotalTime(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              placeholder="Moving HH:MM:SS"
              value={manualMovingTime}
              onChange={(event) => setManualMovingTime(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              type="number"
              min="1"
              placeholder="Avg HR"
              value={manualAvgHr}
              onChange={(event) => setManualAvgHr(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              type="number"
              min="1"
              placeholder="Max HR"
              value={manualMaxHr}
              onChange={(event) => setManualMaxHr(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              type="number"
              min="0"
              placeholder="D+ m"
              value={manualElevationGain}
              onChange={(event) => setManualElevationGain(event.target.value)}
            />
            <input
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
              type="number"
              min="0"
              placeholder="D- m"
              value={manualElevationLoss}
              onChange={(event) => setManualElevationLoss(event.target.value)}
            />
            <textarea
              className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)] md:col-span-3"
              placeholder="Notes"
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
            />
            <Button type="submit" className="w-full md:w-auto md:self-start">
              Save manual run
            </Button>
          </form>
        </Card>
      ) : null}

      <Card subtitle="Sort, filter, inspect, or delete imported runs.">
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <select
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value as RunSource | "all")
            }
          >
            <option value="all">All sources</option>
            <option value="gpx">GPX</option>
            <option value="strava">Strava</option>
            <option value="manual">Manual</option>
          </select>
          <select
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="date">Sort by date</option>
            <option value="distance">Sort by distance</option>
            <option value="moving_time">Sort by time</option>
            <option value="avg_pace">Sort by pace</option>
            <option value="avg_hr">Sort by avg HR</option>
            <option value="elevation_gain">Sort by D+</option>
          </select>
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <input
            className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--bone)]"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <p className="self-center text-sm text-[var(--muted-foreground)]">
            Showing {visibleRuns.length} of {filteredRuns.length} filtered
          </p>
        </div>

        <div className="ui-label mt-4 flex flex-wrap items-center gap-2 font-bold text-[#d8bd8a]">
          <span>{formatNumber(filteredRuns.length)} runs</span>
          <span aria-hidden="true">·</span>
          <span>{filteredTotals.distance.toFixed(1)} km</span>
          <span aria-hidden="true">·</span>
          <span>{formatNumber(Math.round(filteredTotals.elevation))} m ↑</span>
        </div>

        {filteredRuns.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            No runs match these filters.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:hidden">
              {visibleRuns.map((run) => {
                const zone = analyzeRun(run, profile).zone;
                const prBadgeLabel = formatPrBadgeLabel(
                  currentPrBadgeMap.get(run.id)
                );

                return (
                  <MobileRunCard
                    key={run.id}
                    onDelete={(selectedRun) => void handleDelete(selectedRun)}
                    prBadgeLabel={prBadgeLabel}
                    run={run}
                    showElevation={showElevation}
                    zone={zone}
                  />
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--secondary)]">
                  <tr>
                    <th className="py-2">Date</th>
                    <th>Distance</th>
                    <th>Time</th>
                    <th>Pace</th>
                    <th>Splits</th>
                    <th>Avg HR</th>
                    <th>Zone</th>
                    {showElevation ? <th>D+</th> : null}
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visibleRuns.map((run) => {
                    const zone = analyzeRun(run, profile).zone;
                    const prBadgeLabel = formatPrBadgeLabel(
                      currentPrBadgeMap.get(run.id)
                    );

                    return (
                      <tr key={run.id} className="align-middle">
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              className="font-medium text-[var(--bone)]"
                              href={`/runs/${run.id}`}
                            >
                              {run.title ?? "Untitled run"}
                            </a>
                            {prBadgeLabel ? (
                              <PrBadge label={prBadgeLabel} />
                            ) : null}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {run.date}
                          </div>
                        </td>
                        <td>{formatKm(run.distance)}</td>
                        <td>{formatDuration(run.moving_time)}</td>
                        <td>{formatPace(run.avg_pace)}</td>
                        <td>
                          <SplitsSparkline run={run} />
                        </td>
                        <td>{run.avg_hr ?? "-"}</td>
                        <td>
                          {zone ? (
                            <Badge variant={zone}>{zoneLabel(zone)}</Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        {showElevation ? (
                          <td>{run.elevation_gain.toFixed(0)} m</td>
                        ) : null}
                        <td>{run.source.toUpperCase()}</td>
                        <td>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void handleDelete(run)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRuns.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm">
                    Page {currentPage} of {pageCount}
                  </p>
                  <div className="relative" ref={pageSizeRef}>
                    <button
                      aria-expanded={pageSizeOpen}
                      className="inline-flex min-h-10 items-center gap-2 rounded-[2px] border border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_84%,black)] px-3 py-2 text-[var(--bone)]"
                      onClick={() => setPageSizeOpen((value) => !value)}
                      type="button"
                    >
                      {pageSize}
                      <span aria-hidden="true">▾</span>
                    </button>
                    {pageSizeOpen ? (
                      <div className="absolute bottom-[calc(100%+0.25rem)] left-0 z-20 grid min-w-full overflow-hidden rounded-[2px] border border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_84%,black)] text-[var(--bone)]">
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <button
                            className={`px-3 py-2 text-left transition hover:bg-[var(--muted)] ${
                              option === pageSize ? "bg-[var(--muted)]" : ""
                            }`}
                            key={option}
                            onClick={() => {
                              setPageSize(option);
                              setPageSizeOpen(false);
                            }}
                            type="button"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={currentPage === pageCount}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(pageCount, page + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
