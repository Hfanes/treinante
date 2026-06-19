"use client";

import { useState } from "react";

import { Card } from "@/components/ui";
import { buildRacePredictions, vo2maxFromPace } from "@/lib/calculations";
import { formatDuration, formatPace } from "@/lib/runAnalysis";

type Mode = "time" | "pace";

interface ManualRaceCalculatorProps {
  initialDistance: number;
  initialTime: number;
}

interface PredictorExplanationToggleProps {
  anchorLabel: string;
  anchorPace: string;
}

function safeNumber(value: string, fallback: number) {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : fallback;
}

export function PredictorExplanationToggle({
  anchorLabel,
  anchorPace,
}: PredictorExplanationToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4">
      <button
        className="mb-2 inline-flex items-center gap-1 font-mono text-[0.5rem] tracking-[0.08em] text-[var(--primary)]"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
        {expanded ? "Hide method" : "Show method"}
      </button>
      {expanded ? (
        <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--muted-foreground)]">
          <p>
            Pace-based means estimated from running speed. This uses{" "}
            {anchorLabel} at {anchorPace}.
          </p>
          <p>
            Rolling window means the app slides a fixed-distance window across
            your splits and finds the fastest consecutive block. A 5 km rolling
            window checks km 1-5, then 2-6, then 3-7, and so on.
          </p>
          <p>
            It only uses the last 90 days so the estimate reflects current
            fitness. It checks longer windows first: 21 km, then 10 km, then 5
            km, then 3 km.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ManualRaceCalculator({
  initialDistance,
  initialTime,
}: ManualRaceCalculatorProps) {
  const [mode, setMode] = useState<Mode>("time");
  const [distance, setDistance] = useState(String(initialDistance));
  const [minutes, setMinutes] = useState(String(Math.floor(initialTime / 60)));
  const [seconds, setSeconds] = useState(String(initialTime % 60));
  const [paceMinutes, setPaceMinutes] = useState(
    String(Math.floor(initialTime / initialDistance / 60))
  );
  const [paceSeconds, setPaceSeconds] = useState(
    String(Math.round((initialTime / initialDistance) % 60))
  );
  const distanceValue = safeNumber(distance, 0);
  const minutesValue = safeNumber(minutes, 0);
  const secondsValue = safeNumber(seconds, 0);
  const paceMinutesValue = safeNumber(paceMinutes, 0);
  const paceSecondsValue = safeNumber(paceSeconds, 0);
  const anchorTime =
    mode === "time"
      ? minutesValue * 60 + secondsValue
      : Math.round((paceMinutesValue * 60 + paceSecondsValue) * distanceValue);
  const anchorPace = distanceValue > 0 ? anchorTime / distanceValue : 0;
  const vdot = vo2maxFromPace(anchorTime, distanceValue);
  const projections = buildRacePredictions(anchorTime, distanceValue);

  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[360px_1fr]">
      <Card
        className="bg-[color-mix(in_oklch,var(--background)_82%,black)] text-[var(--bone)]"
        subtitle="Anchor performance"
      >
        <div className="grid min-w-0 grid-cols-2 rounded-[2px] bg-[var(--muted)] p-1 text-sm">
          {(["time", "pace"] as const).map((item) => (
            <button
              className={`min-h-11 rounded-[2px] px-3 py-2 font-medium ${
                mode === item
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--foreground)]"
              }`}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              Distance + {item === "time" ? "time" : "pace"}
            </button>
          ))}
        </div>

        <label className="ui-label mt-5 grid gap-3">
          <span className="flex items-center justify-between gap-3">
            Distance (km)
            <span className="font-mono text-2xl text-[var(--bone)]">
              {distanceValue.toFixed(1)}
            </span>
          </span>
          <input
            className="h-2 w-full appearance-none rounded-[2px] bg-white/10 accent-[var(--primary)]"
            max="42.2"
            min="0.1"
            onChange={(event) => setDistance(event.target.value)}
            step="0.1"
            type="range"
            value={distance}
          />
          <span className="flex min-w-0 justify-between font-mono text-[0.68rem] text-[var(--muted-foreground)]">
            <span>0.1</span>
            <span>42.2</span>
          </span>
        </label>

        {mode === "time" ? (
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
            <label className="ui-label grid gap-2">
              Minutes
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-2xl text-[var(--bone)]"
                min="0"
                onChange={(event) => setMinutes(event.target.value)}
                type="number"
                value={minutes}
              />
            </label>
            <label className="ui-label grid gap-2">
              Seconds
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-2xl text-[var(--bone)]"
                max="59"
                min="0"
                onChange={(event) => setSeconds(event.target.value)}
                type="number"
                value={seconds}
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
            <label className="ui-label grid gap-2">
              Pace min/km
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-2xl text-[var(--bone)]"
                min="0"
                onChange={(event) => setPaceMinutes(event.target.value)}
                type="number"
                value={paceMinutes}
              />
            </label>
            <label className="ui-label grid gap-2">
              Pace sec/km
              <input
                className="rounded-[2px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-2xl text-[var(--bone)]"
                max="59"
                min="0"
                onChange={(event) => setPaceSeconds(event.target.value)}
                type="number"
                value={paceSeconds}
              />
            </label>
          </div>
        )}

        <div className="mt-6 grid min-w-0 grid-cols-2 gap-3 border-t border-white/10 pt-5">
          <div>
            <div className="ui-label">
              {mode === "time" ? "Pace" : "Finish time"}
            </div>
            <div className="mt-1 font-mono text-xl font-semibold">
              {mode === "time"
                ? formatPace(anchorPace)
                : formatDuration(anchorTime)}
            </div>
          </div>
          <div>
            <div className="ui-label">VDOT est.</div>
            <div className="mt-1 font-mono text-xl font-semibold">
              {vdot?.toFixed(1) ?? "-"}
            </div>
          </div>
        </div>
      </Card>

      <Card subtitle="Across every standard distance.">
        <h2 className="instrument-heading text-2xl text-[var(--bone)]">
          Projected times
        </h2>
        <div className="mt-4 grid gap-3 md:hidden">
          {projections.map((projection) => (
            <article
              className="rounded-[2px] border border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_92%,black)] p-3"
              key={projection.key}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-[var(--bone)]">
                  {projection.label}
                </p>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {projection.distance.toFixed(3).replace(/\.0+$/, "")} km
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="ui-label">Time</dt>
                  <dd className="mt-1 font-mono text-[var(--bone)]">
                    {projection.predictedTime
                      ? formatDuration(projection.predictedTime)
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="ui-label">Pace</dt>
                  <dd className="mt-1 font-mono text-[var(--bone)]">
                    {projection.pace ? formatPace(projection.pace) : "-"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-2">Distance</th>
                <th>km</th>
                <th>Time</th>
                <th>Pace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {projections.map((projection) => (
                <tr key={projection.key}>
                  <td className="py-3 font-medium text-gray-950 dark:text-white">
                    {projection.label}
                  </td>
                  <td>{projection.distance.toFixed(3).replace(/\.0+$/, "")}</td>
                  <td>
                    {projection.predictedTime
                      ? formatDuration(projection.predictedTime)
                      : "-"}
                  </td>
                  <td>{projection.pace ? formatPace(projection.pace) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ui-label mt-4">
          Model · Riegel exponent 1.06 · Assumes equal fitness and flat course.
        </p>
      </Card>
    </section>
  );
}
