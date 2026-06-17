"use client";

import { useEffect, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

import type { FitnessPoint } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

let zoomPluginReady = false;

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "6m", days: 183 },
  { label: "1y", days: 365 },
  { label: "All", days: null },
];

const borderColor = "oklch(0.36 0.012 80)";
const labelColor = "oklch(0.62 0.05 78)";
const ctlColor = "#f3d49b";
const atlColor = "#7f6d4d";
const positiveTsbColor = "#f3d49b";
const negativeTsbColor = "#6f674d";

const chartPlugins = {
  legend: {
    position: "bottom" as const,
    labels: {
      boxHeight: 2,
      boxWidth: 12,
      color: labelColor,
      font: { family: "Space Mono", size: 11 },
    },
  },
  tooltip: {
    backgroundColor: "oklch(0.265 0.012 80)",
    borderColor,
    borderWidth: 1,
    bodyColor: "oklch(0.88 0.04 85)",
    bodyFont: { family: "Space Mono", size: 11 },
    cornerRadius: 2,
    padding: 12,
    titleColor: labelColor,
    titleFont: { family: "Space Mono", size: 11 },
  },
};

const chartScales = {
  x: {
    border: { color: borderColor },
    grid: { color: borderColor, lineWidth: 0.5 },
    ticks: { color: labelColor, font: { family: "Space Mono", size: 10 } },
  },
  y: {
    border: { color: borderColor },
    grid: { color: borderColor, lineWidth: 0.5 },
    ticks: { color: labelColor, font: { family: "Space Mono", size: 10 } },
  },
};

function visiblePoints(points: FitnessPoint[], days: number | null) {
  if (!days) return points;
  return points.slice(-days);
}

function rangeEyebrow(days: number | null) {
  return days ? `[ Last ${days} days ]` : "[ All history ]";
}

export function FitnessCharts({ points }: { points: FitnessPoint[] }) {
  const [range, setRange] = useState(RANGES[1]);
  const [zoomReady, setZoomReady] = useState(zoomPluginReady);

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

  const visible = visiblePoints(points, range.days);
  const labels = visible.map((point) => point.date.slice(5));

  const lineData: ChartData<"line", number[], string> = {
    labels,
    datasets: [
      {
        label: "CTL fitness",
        data: visible.map((point) => point.ctl),
        borderColor: ctlColor,
        backgroundColor: "transparent",
        borderWidth: 4,
        borderCapStyle: "round",
        borderJoinStyle: "round",
        pointRadius: 0,
        tension: 0.34,
      },
      {
        label: "ATL fatigue",
        data: visible.map((point) => point.atl),
        borderColor: atlColor,
        backgroundColor: "transparent",
        borderWidth: 4,
        borderCapStyle: "round",
        borderJoinStyle: "round",
        pointRadius: 0,
        tension: 0.18,
      },
    ],
  };
  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      ...chartPlugins,
      legend: { display: false },
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
        display: false,
        grid: { display: false },
      },
      y: {
        display: false,
        beginAtZero: true,
        grid: { display: false },
      },
    },
  };
  const barData: ChartData<"bar", number[], string> = {
    labels,
    datasets: [
      {
        label: "TSB form",
        data: visible.map((point) => point.tsb),
        backgroundColor: visible.map((point) =>
          point.tsb >= 0 ? positiveTsbColor : negativeTsbColor
        ),
        borderRadius: 0,
      },
    ],
  };
  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    plugins: {
      ...chartPlugins,
      legend: { display: false },
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
      ...chartScales,
      y: { ...chartScales.y, title: { display: true, text: "CTL - ATL" } },
    },
  };

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
        {RANGES.map((item) => (
          <button
            className={`min-h-11 rounded-[2px] border px-2 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] transition sm:px-3 ${
              item.label === range.label
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
            }`}
            key={item.label}
            onClick={() => setRange(item)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="vbars-dense rounded-[2px] bg-[color-mix(in_oklch,var(--card)_88%,black)] p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="ui-label text-[#f3d49b]">
              {rangeEyebrow(range.days)}
            </p>
            <h2 className="instrument-heading mt-3 text-3xl leading-none text-[#f3d49b] sm:text-4xl">
              CTL · ATL overlay
            </h2>
          </div>
          <div className="flex flex-wrap gap-5 pt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#f3d49b]">
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-8 bg-[#f3d49b]" aria-hidden="true" />
              CTL - Fitness
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-8 bg-[#7f6d4d]" aria-hidden="true" />
              ATL - Fatigue
            </span>
          </div>
        </div>
        <div className="h-[240px] sm:h-[340px]">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
      <div className="h-[180px] rounded-[2px] border border-[var(--border)] p-3 sm:h-[220px]">
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
}
