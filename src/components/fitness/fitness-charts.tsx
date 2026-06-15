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
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96, 165, 250, 0.12)",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.32,
      },
      {
        label: "ATL fatigue",
        data: visible.map((point) => point.atl),
        borderColor: "#f87171",
        backgroundColor: "rgba(248, 113, 113, 0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.32,
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
      y: {
        ...chartScales.y,
        beginAtZero: true,
        title: { display: true, text: "load" },
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
          point.tsb >= 0 ? "rgba(34, 197, 94, 0.78)" : "rgba(239, 68, 68, 0.78)"
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
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <button
            className={`rounded-full border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] transition ${
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

      <div className="h-[340px] rounded-[2px] border border-[var(--border)] p-3">
        <Line data={lineData} options={lineOptions} />
      </div>
      <div className="h-[220px] rounded-[2px] border border-[var(--border)] p-3">
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
}
