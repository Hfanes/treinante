"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { Button, Card } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useRuns } from "@/hooks/useRuns";
import { upsertCachedRuns } from "@/lib/idb";
import { parseGPX } from "@/lib/gpxParser";
import { createBrowserClient } from "@/lib/supabase";
import type { Run, RunDraft, RunSource } from "@/types";

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

export function RunListClient({ initialRuns }: { initialRuns: Run[] }) {
  const { user } = useAuth();
  const { runs, addRun, deleteRun, loading } = useRuns();
  const [pendingGpx, setPendingGpx] = useState<PendingGpx[]>([]);
  const [sourceFilter, setSourceFilter] = useState<RunSource | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  }, []);

  const displayRuns = runs.length > 0 || !loading ? runs : initialRuns;
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
      })
      .slice(0, 25);
  }, [dateFrom, dateTo, displayRuns, sortKey, sourceFilter]);

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
      <Card className="overflow-hidden border-gray-950 bg-gray-950 text-white dark:border-gray-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-brand-500">
              Import desk
            </div>
            <h2 className="mt-2 text-2xl font-semibold">
              Load real training data.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">
              Drop GPX files for full GPS analysis, or add a clean manual run
              when only distance and time exist.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-950 transition hover:bg-gray-100">
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
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <p className="font-medium text-gray-950 dark:text-white">
                  {item.draft.title}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              placeholder="Title"
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              type="date"
              required
              value={manualDate}
              onChange={(event) => setManualDate(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Distance km"
              value={manualDistance}
              onChange={(event) => setManualDistance(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              required
              placeholder="Total HH:MM:SS"
              value={manualTotalTime}
              onChange={(event) => setManualTotalTime(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              placeholder="Moving HH:MM:SS"
              value={manualMovingTime}
              onChange={(event) => setManualMovingTime(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              type="number"
              min="1"
              placeholder="Avg HR"
              value={manualAvgHr}
              onChange={(event) => setManualAvgHr(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              type="number"
              min="1"
              placeholder="Max HR"
              value={manualMaxHr}
              onChange={(event) => setManualMaxHr(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              type="number"
              min="0"
              placeholder="D+ m"
              value={manualElevationGain}
              onChange={(event) => setManualElevationGain(event.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              type="number"
              min="0"
              placeholder="D- m"
              value={manualElevationLoss}
              onChange={(event) => setManualElevationLoss(event.target.value)}
            />
            <textarea
              className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-3 dark:border-gray-700 dark:bg-gray-950"
              placeholder="Notes"
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
            />
            <Button type="submit" className="md:self-start">
              Save manual run
            </Button>
          </form>
        </Card>
      ) : null}

      <Card subtitle="Sort, filter, inspect, or delete imported runs.">
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
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
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
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
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <p className="self-center text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredRuns.length} of {displayRuns.length}
          </p>
        </div>

        {filteredRuns.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            No runs match these filters.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Distance</th>
                  <th>Time</th>
                  <th>Pace</th>
                  <th>Avg HR</th>
                  {showElevation ? <th>D+</th> : null}
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="align-middle">
                    <td className="py-3">
                      <a
                        className="font-medium text-gray-950 dark:text-white"
                        href={`/runs/${run.id}`}
                      >
                        {run.title ?? "Untitled run"}
                      </a>
                      <div className="text-xs text-gray-500">{run.date}</div>
                    </td>
                    <td>{formatKm(run.distance)}</td>
                    <td>{formatDuration(run.moving_time)}</td>
                    <td>{formatPace(run.avg_pace)}</td>
                    <td>{run.avg_hr ?? "-"}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
