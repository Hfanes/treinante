"use client";

import { useActionState, useState } from "react";

import { type SaveMaxHrState, saveEstimatedMaxHr } from "@/app/tools/actions";
import { Badge, Button, Card } from "@/components/ui";
import { formatDuration, formatPace } from "@/lib/runAnalysis";
import {
  TOOL_DISTANCES,
  type ToolDistanceKey,
  buildGelSchedule,
  classifyHill,
  computeZones,
  estimatedMaxHrFromLthr,
  finishSeconds,
} from "@/lib/trainingTools";

const zoneUse = {
  z1: "Easy shakeout",
  z2: "Long runs, base building",
  z3: "Comfortably hard",
  z4: "Intervals, race pace",
  z5: "Short hard efforts",
};

const initialSaveState: SaveMaxHrState = { status: "idle", message: null };

function paceLabel(seconds: number) {
  return formatPace(seconds).replace(" /km", "/km");
}

function distanceLabel(key: ToolDistanceKey) {
  return TOOL_DISTANCES.find((item) => item.key === key) ?? TOOL_DISTANCES[2];
}

function inputNumber(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function PaceCalculator({ pace }: { pace: number }) {
  return (
    <Card className="overflow-hidden" subtitle="Target pace to finish time.">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
            Pace calculator
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            One pace, every common target distance.
          </p>
        </div>
        <Badge>{paceLabel(pace)}</Badge>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Distance</th>
              <th className="px-3 py-2">Finish time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {TOOL_DISTANCES.map((distance) => (
              <tr key={distance.key}>
                <td className="px-3 py-3 font-medium text-gray-950 dark:text-white">
                  {distance.label}
                </td>
                <td className="px-3 py-3 font-mono">
                  {formatDuration(finishSeconds(pace, distance.distanceKm))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GelTimeline({
  finishTime,
  gels,
}: {
  finishTime: number;
  gels: ReturnType<typeof buildGelSchedule>;
}) {
  return (
    <svg className="mt-4 h-16 w-full" role="img" aria-label="Gel timeline">
      <line
        x1="5%"
        x2="95%"
        y1="34"
        y2="34"
        className="stroke-gray-300 dark:stroke-gray-700"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="5%" cy="34" r="5" className="fill-gray-500" />
      <circle cx="95%" cy="34" r="5" className="fill-brand-600" />
      {gels.map((gel) => {
        const x = 5 + Math.min(90, (gel.minute * 60 * 90) / finishTime);
        return (
          <g key={gel.label}>
            <circle cx={`${x}%`} cy="34" r="7" className="fill-amber-500" />
            <text
              x={`${x}%`}
              y="18"
              textAnchor="middle"
              className="fill-gray-600 text-[10px] dark:fill-gray-300"
            >
              {gel.minute}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GelCalculator({ pace }: { pace: number }) {
  const [distanceKey, setDistanceKey] = useState<ToolDistanceKey>("half");
  const distance = distanceLabel(distanceKey);
  const finishTime = finishSeconds(pace, distance.distanceKm);
  const gels = buildGelSchedule(finishTime, pace);

  return (
    <Card subtitle="Simple fueling checkpoints for long efforts.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
            Gel timing
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {distance.label} at {paceLabel(pace)} - finish{" "}
            {formatDuration(finishTime)}.
          </p>
        </div>
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          value={distanceKey}
          onChange={(event) =>
            setDistanceKey(event.target.value as ToolDistanceKey)
          }
        >
          {TOOL_DISTANCES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {gels.length === 0 ? (
        <p className="mt-5 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
          Effort too short for gels.
        </p>
      ) : (
        <>
          <GelTimeline finishTime={finishTime} gels={gels} />
          <div className="mt-4 grid gap-2">
            {gels.map((gel) => (
              <div
                className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-950"
                key={gel.label}
              >
                <div>
                  <span className="font-medium text-gray-950 dark:text-white">
                    {gel.label}
                  </span>{" "}
                  <span className="text-gray-500 dark:text-gray-400">
                    ({gel.type.toLowerCase()}){gel.optional ? " optional" : ""}
                  </span>
                </div>
                <div className="font-mono">
                  {formatDuration(gel.minute * 60)}
                </div>
                <div className="font-mono">km {gel.km?.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
        <li>Take gels 15-20 min before you feel you need them.</li>
        <li>Wash down with water, not sports drink.</li>
        <li>Practice gel timing in training before race day.</li>
      </ul>
    </Card>
  );
}

function HillCalculator() {
  const [elevation, setElevation] = useState("120");
  const [distance, setDistance] = useState("1000");
  const result = classifyHill(
    inputNumber(elevation, 0),
    inputNumber(distance, 1)
  );

  return (
    <Card subtitle="Convert climb stats into training intent.">
      <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
        Hill gradient
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
          Elevation gain (m)
          <input
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            min="0"
            type="number"
            value={elevation}
            onChange={(event) => setElevation(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
          Distance (m)
          <input
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            min="1"
            type="number"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl bg-gray-950 p-4 text-white dark:bg-black">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Gradient</span>
          <span className="font-mono text-xl font-semibold">
            {result.gradient.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">D+/km</span>
          <span className="font-mono text-xl font-semibold">
            {Math.round(result.dPlusPerKm)} m/km
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Classification</span>
          <span className="font-semibold">{result.classification.label}</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        {result.classification.description}
      </p>
      <div className="mt-4 grid gap-2 text-sm text-gray-700 dark:text-gray-300">
        <div>
          Hill repeats (6-10%): {result.suitableForHillRepeats ? "Yes" : "No"}
        </div>
        <div>
          Hill sprints (8-15%): {result.suitableForHillSprints ? "Yes" : "No"}
        </div>
      </div>
    </Card>
  );
}

function ZoneCalculator({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [lthr, setLthr] = useState("168");
  const [saveState, formAction, pending] = useActionState(
    saveEstimatedMaxHr,
    initialSaveState
  );
  const lthrValue = inputNumber(lthr, 168);
  const zones = computeZones(lthrValue);
  const estimatedMaxHr = estimatedMaxHrFromLthr(lthrValue);

  return (
    <Card subtitle="Use a hard 20-minute test to set practical HR zones.">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
            Zone 2 HR
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Run or cycle as hard as you can sustain for 20 minutes.
          </p>
        </div>
        <Badge variant="z2">Z2 focus</Badge>
      </div>

      <label className="mt-4 grid gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
        20-min average HR
        <input
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
          min="1"
          type="number"
          value={lthr}
          onChange={(event) => setLthr(event.target.value)}
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2">Range</th>
              <th className="px-3 py-2">Use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {Object.entries(zones).map(([key, zone]) => (
              <tr
                className={
                  key === "z2" ? "bg-green-50 dark:bg-green-950/30" : ""
                }
                key={key}
              >
                <td className="px-3 py-3 font-semibold uppercase">{key}</td>
                <td className="px-3 py-3 font-mono">
                  {key === "z5" ? `${zone.min}+` : `${zone.min} - ${zone.max}`}{" "}
                  bpm
                </td>
                <td className="px-3 py-3">
                  {zone.label} · {zoneUse[key as keyof typeof zoneUse]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
        Zone 2 target: {zones.z2.min} - {zones.z2.max} bpm. Keep easy runs below{" "}
        {zones.z2.max} bpm.
      </p>

      <form
        action={formAction}
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input name="lthr" type="hidden" value={lthrValue} />
        <Button disabled={!isLoggedIn || pending} type="submit">
          {pending
            ? "Saving..."
            : estimatedMaxHr
              ? `Save ${estimatedMaxHr} bpm as my max HR`
              : "Save as my max HR"}
        </Button>
        {!isLoggedIn ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Sign in to save your zone settings and personalise predictions.
          </span>
        ) : null}
      </form>
      {saveState.message ? (
        <p
          className={`mt-3 text-sm ${saveState.status === "saved" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {saveState.message}
        </p>
      ) : null}
    </Card>
  );
}

export function TrainingToolsClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [pace, setPace] = useState(330);

  return (
    <div className="grid gap-5">
      <Card className="border-gray-950 bg-gray-950 text-white dark:border-gray-800 dark:bg-black">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400">
              Shared pace input
            </div>
            <div className="mt-2 text-3xl font-semibold">{paceLabel(pace)}</div>
          </div>
          <label className="grid flex-1 gap-2 text-sm text-gray-300 lg:max-w-2xl">
            Pace per km
            <input
              aria-label="Pace per kilometer"
              className="accent-brand-500"
              max="600"
              min="240"
              step="5"
              type="range"
              value={pace}
              onChange={(event) => setPace(Number(event.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>4:00/km</span>
              <span>10:00/km</span>
            </div>
          </label>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <PaceCalculator pace={pace} />
        <GelCalculator pace={pace} />
        <HillCalculator />
        <ZoneCalculator isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
