"use client";

import { useState } from "react";
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
import zoomPlugin from "chartjs-plugin-zoom";
import { Bar, Line } from "react-chartjs-2";

import type { FitnessPoint } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  zoomPlugin
);

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "6m", days: 183 },
  { label: "1y", days: 365 },
  { label: "All", days: null },
];

function visiblePoints(points: FitnessPoint[], days: number | null) {
  if (!days) return points;
  return points.slice(-days);
}

export function FitnessCharts({ points }: { points: FitnessPoint[] }) {
  const [range, setRange] = useState(RANGES[1]);
  const visible = visiblePoints(points, range.days);
  const labels = visible.map((point) => point.date.slice(5));

  const lineData: ChartData<"line", number[], string> = {
    labels,
    datasets: [
      {
        label: "CTL fitness",
        data: visible.map((point) => point.ctl),
        borderColor: "rgb(37, 99, 235)",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.32,
      },
      {
        label: "ATL fatigue",
        data: visible.map((point) => point.atl),
        borderColor: "rgb(220, 38, 38)",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.32,
      },
    ],
  };
  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan: { enabled: true, mode: "x" },
      },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "load" } },
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
        borderRadius: 5,
      },
    ],
  };
  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan: { enabled: true, mode: "x" },
      },
    },
    scales: {
      y: { title: { display: true, text: "CTL - ATL" } },
    },
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <button
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              item.label === range.label
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-200 text-gray-700 hover:border-brand-500 dark:border-gray-800 dark:text-gray-200"
            }`}
            key={item.label}
            onClick={() => setRange(item)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-[340px] rounded-lg border border-gray-200 p-3 dark:border-gray-800">
        <Line data={lineData} options={lineOptions} />
      </div>
      <div className="h-[220px] rounded-lg border border-gray-200 p-3 dark:border-gray-800">
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
}
