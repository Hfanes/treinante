"use client";

import { useEffect, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Chart } from "react-chartjs-2";

import { formatPace } from "@/lib/runAnalysis";
import type { AnalyzedSplit } from "@/lib/runAnalysis";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  annotationPlugin
);

let zoomPluginReady = false;

const paceColor = "#f3d49b";
const gapColor = "#7f6d4d";
const hrColor = "#8f815f";

export function RunSplitsChart({ splits }: { splits: AnalyzedSplit[] }) {
  const [zoomReady, setZoomReady] = useState(zoomPluginReady);
  const [showPace, setShowPace] = useState(false);
  const [showHr, setShowHr] = useState(false);

  useEffect(() => {
    if (zoomPluginReady) {
      setZoomReady(true);
      return;
    }

    let mounted = true;

    void import("chartjs-plugin-zoom").then(({ default: zoomPlugin }) => {
      ChartJS.register(zoomPlugin);
      zoomPluginReady = true;
      if (mounted) setZoomReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const hasHr = splits.some((split) => split.hr !== null);
  const hasElevation = splits.some((split) => split.elevation > 0);
  const hasGap = splits.some((split) => split.gap !== null);
  const paceValues = splits.flatMap((split) =>
    split.gap ? [split.pace, split.gap] : [split.pace]
  );
  const minPace = Math.max(1, Math.min(...paceValues) - 30);
  const maxPace = Math.max(...paceValues) + 30;
  const hrValues = splits
    .map((split) => split.hr)
    .filter((value): value is number => value !== null);
  const minHr = hrValues.length ? Math.max(1, Math.min(...hrValues) - 8) : 0;
  const maxHr = hrValues.length ? Math.max(...hrValues) + 8 : 1;
  const avgPace = Math.round(
    paceValues.reduce((sum, value) => sum + value, 0) / paceValues.length
  );
  const avgHr = hrValues.length
    ? Math.round(
        hrValues.reduce((sum, value) => sum + value, 0) / hrValues.length
      )
    : null;
  const labels = splits.map((split) => `${split.km.toFixed(1)} km`);
  const data: ChartData<"line", (number | null)[], string> = {
    labels,
    datasets: [
      ...(hasElevation
        ? [
            {
              type: "line" as const,
              label: "Elevation",
              data: splits.map((split) => split.elevation),
              yAxisID: "elevation",
              borderColor: "oklch(0.45 0.03 80 / 0.65)",
              backgroundColor: "oklch(0.45 0.03 80 / 0.28)",
              borderWidth: 1,
              fill: "origin" as const,
              pointRadius: 0,
              tension: 0.28,
              order: 3,
            },
          ]
        : []),
      ...(showPace
        ? [
            {
              type: "line" as const,
              label: "Pace",
              data: splits.map((split) => split.pace),
              yAxisID: "pace",
              borderColor: paceColor,
              borderWidth: 2.5,
              pointRadius: 0,
              tension: 0.3,
              order: 1,
            },
          ]
        : []),
      ...(showPace && hasGap
        ? [
            {
              type: "line" as const,
              label: "GAP",
              data: splits.map((split) => split.gap),
              yAxisID: "pace",
              borderColor: gapColor,
              borderDash: [4, 4],
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3,
              order: 1,
            },
          ]
        : []),
      ...(showHr && hasHr
        ? [
            {
              type: "line" as const,
              label: "HR",
              data: splits.map((split) => split.hr),
              yAxisID: "hr",
              borderColor: hrColor,
              borderWidth: 2.5,
              pointRadius: 0,
              tension: 0.3,
              order: 2,
            },
          ]
        : []),
    ],
  };
  const annotations = splits
    .filter((split) => split.is_stop)
    .map((split) => ({
      type: "box" as const,
      xMin: split.km - 1.5,
      xMax: split.km - 0.5,
      backgroundColor: "rgba(107, 114, 128, 0.14)",
      borderWidth: 0,
    }));
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxHeight: 2,
          boxWidth: 12,
          color: "oklch(0.62 0.05 78)",
          font: { family: "Space Mono", size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "oklch(0.265 0.012 80)",
        borderColor: "oklch(0.36 0.012 80)",
        borderWidth: 1,
        bodyColor: "oklch(0.88 0.04 85)",
        bodyFont: { family: "Space Mono", size: 11 },
        cornerRadius: 2,
        padding: 12,
        titleColor: "oklch(0.62 0.05 78)",
        titleFont: { family: "Space Mono", size: 11 },
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (item) => {
            const value = Number(item.raw);
            if (!Number.isFinite(value)) return `${item.dataset.label}: -`;
            if (item.dataset.yAxisID === "pace") {
              return `${item.dataset.label}: ${formatPace(value)}`;
            }
            if (item.dataset.yAxisID === "hr") {
              return `HR: ${Math.round(value)} bpm`;
            }
            return `Elevation: ${Math.round(value)} m`;
          },
        },
      },
      annotation: { annotations },
      ...(zoomReady
        ? {
            zoom: {
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: "x" as const,
              },
              pan: { enabled: true, mode: "x" as const },
            },
          }
        : {}),
    },
    scales: {
      x: {
        border: { color: "oklch(0.36 0.012 80)" },
        grid: { color: "oklch(0.36 0.012 80)", lineWidth: 0.5 },
        ticks: {
          color: "oklch(0.55 0.025 80)",
          font: { family: "Space Mono", size: 10 },
        },
      },
      elevation: {
        type: "linear",
        position: "left",
        border: { color: "oklch(0.36 0.012 80)" },
        grid: { color: "oklch(0.36 0.012 80)", lineWidth: 0.5 },
        ticks: {
          callback: (value) => `${Math.round(Number(value))} m`,
          color: "oklch(0.55 0.025 80)",
          font: { family: "Space Mono", size: 10 },
        },
      },
      pace: {
        type: "linear",
        display: showPace,
        position: "right",
        reverse: true,
        min: minPace,
        max: maxPace,
        ticks: { callback: (value) => formatPace(Number(value)) },
        border: { color: "oklch(0.36 0.012 80)" },
        grid: { drawOnChartArea: false },
      },
      hr: {
        type: "linear",
        display: showHr && !showPace,
        position: "right",
        min: minHr,
        max: maxHr,
        border: { color: "oklch(0.36 0.012 80)" },
        grid: {
          color: "oklch(0.36 0.012 80)",
          drawOnChartArea: false,
          lineWidth: 0.5,
        },
        ticks: {
          color: "oklch(0.62 0.05 78)",
          font: { family: "Space Mono", size: 10 },
        },
      },
    },
  };

  return (
    <div>
      <div className="h-[240px] w-full sm:h-[320px]">
        <Chart type="line" data={data} options={options} />
      </div>
      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-[1fr_1fr] gap-4 border-b border-[var(--border)] pb-4 text-center sm:mt-8 sm:gap-8">
        <MetricToggle
          checked={showPace}
          label="Pace"
          onChange={() => setShowPace((value) => !value)}
        />
        <MetricToggle
          checked={showHr}
          disabled={!hasHr}
          label="Heart Rate"
          onChange={() => setShowHr((value) => !value)}
        />
      </div>
      <div className="mx-auto grid max-w-3xl grid-cols-[1fr_1fr_1fr] gap-3 py-3 text-center sm:gap-8">
        <div className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--bone)]">
          Avg
        </div>
        <div className="font-mono text-sm text-[var(--bone)]">
          {formatPace(avgPace)}
        </div>
        <div className="font-mono text-sm text-[var(--bone)]">
          {avgHr === null ? "-" : `${avgHr} bpm`}
        </div>
      </div>
    </div>
  );
}

function MetricToggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="grid justify-items-center gap-2">
      <div className="text-sm text-[var(--bone)]">{label}</div>
      <button
        aria-pressed={checked}
        className={`relative h-6 w-11 rounded-full border border-[var(--border)] transition disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`}
        disabled={disabled}
        onClick={onChange}
        type="button"
      >
        <span
          className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--bone)] transition ${checked ? "left-[calc(100%-1.5rem)]" : "left-[-1px]"}`}
        />
        {checked ? (
          <span className="absolute left-1 top-1/2 -translate-y-1/2 font-mono text-[0.55rem] uppercase text-[var(--primary-foreground)]">
            on
          </span>
        ) : null}
      </button>
    </div>
  );
}
