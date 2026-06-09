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

function safeNumber(value: string, fallback: number) {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : fallback;
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
    <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card
        className="bg-gray-950 text-white dark:bg-black"
        subtitle="Anchor performance"
      >
        <div className="flex w-fit rounded-full bg-white/10 p-1 text-sm">
          {(["time", "pace"] as const).map((item) => (
            <button
              className={`rounded-full px-3 py-1 font-medium ${
                mode === item ? "bg-white text-gray-950" : "text-gray-300"
              }`}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              Distance + {item === "time" ? "time" : "pace"}
            </button>
          ))}
        </div>

        <label className="mt-5 grid gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Distance (km)
          <input
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-2xl text-white"
            min="0.1"
            onChange={(event) => setDistance(event.target.value)}
            step="0.1"
            type="number"
            value={distance}
          />
        </label>

        {mode === "time" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Minutes
              <input
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-2xl text-white"
                min="0"
                onChange={(event) => setMinutes(event.target.value)}
                type="number"
                value={minutes}
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Seconds
              <input
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-2xl text-white"
                max="59"
                min="0"
                onChange={(event) => setSeconds(event.target.value)}
                type="number"
                value={seconds}
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Pace min/km
              <input
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-2xl text-white"
                min="0"
                onChange={(event) => setPaceMinutes(event.target.value)}
                type="number"
                value={paceMinutes}
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Pace sec/km
              <input
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-2xl text-white"
                max="59"
                min="0"
                onChange={(event) => setPaceSeconds(event.target.value)}
                type="number"
                value={paceSeconds}
              />
            </label>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {mode === "time" ? "Pace" : "Finish time"}
            </div>
            <div className="mt-1 font-mono text-xl font-semibold">
              {mode === "time"
                ? formatPace(anchorPace)
                : formatDuration(anchorTime)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              VDOT est.
            </div>
            <div className="mt-1 font-mono text-xl font-semibold">
              {vdot?.toFixed(1) ?? "-"}
            </div>
          </div>
        </div>
      </Card>

      <Card subtitle="Across every standard distance.">
        <h2 className="font-semibold text-gray-950 dark:text-white">
          Projected times
        </h2>
        <div className="mt-4 overflow-x-auto">
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
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Model · Riegel exponent 1.06 · Assumes equal fitness and flat course.
        </p>
      </Card>
    </section>
  );
}
