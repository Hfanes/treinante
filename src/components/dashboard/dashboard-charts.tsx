"use client";

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
import { Bar, Line } from "react-chartjs-2";

import {
  formatDashboardPace,
  type FitnessPoint,
  type HrPoint,
  type PacePoint,
  type WeeklyBucket,
} from "@/lib/dashboardAnalysis";

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

const z2Color = "rgba(34, 197, 94, 0.8)";
const z3Color = "rgba(245, 158, 11, 0.82)";
const z4Color = "rgba(239, 68, 68, 0.82)";
const brandColor = "rgba(37, 99, 235, 0.78)";

export function WeeklyVolumeChart({
  buckets,
  weeklyGoal,
  hasZones,
  showElevation,
}: {
  buckets: WeeklyBucket[];
  weeklyGoal: number;
  hasZones: boolean;
  showElevation: boolean;
}) {
  const data: ChartData<"bar", number[], string> = {
    labels: buckets.map((bucket) => bucket.label),
    datasets: hasZones
      ? [
          {
            label: "Z2 km",
            data: buckets.map((bucket) => Number(bucket.zoneKm.z2.toFixed(1))),
            backgroundColor: z2Color,
            stack: "volume",
          },
          {
            label: "Z3 km",
            data: buckets.map((bucket) => Number(bucket.zoneKm.z3.toFixed(1))),
            backgroundColor: z3Color,
            stack: "volume",
          },
          {
            label: "Z4+ km",
            data: buckets.map((bucket) => Number(bucket.zoneKm.z4.toFixed(1))),
            backgroundColor: z4Color,
            stack: "volume",
          },
        ]
      : [
          {
            label: "km",
            data: buckets.map((bucket) => bucket.totalKm),
            backgroundColor: brandColor,
            borderRadius: 6,
          },
        ],
  };
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event, elements) => {
      const index = elements[0]?.index;
      if (index === undefined) return;
      const bucket = buckets[index];
      window.location.assign(
        `/runs?dateFrom=${bucket.start}&dateTo=${bucket.end}`
      );
    },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          title: (items) => `Week of ${items[0]?.label ?? ""}`,
          label: (item) =>
            `${item.dataset.label}: ${Number(item.raw).toFixed(1)} km`,
          afterBody: (items) => {
            const bucket = buckets[items[0]?.dataIndex ?? 0];
            return `${bucket.totalKm.toFixed(1)} km · ${bucket.runs} runs${showElevation ? ` · ${bucket.elevationGain} m D+` : ""}`;
          },
        },
      },
      annotation:
        weeklyGoal > 0
          ? {
              annotations: [
                {
                  type: "line",
                  yMin: weeklyGoal,
                  yMax: weeklyGoal,
                  borderColor: "rgba(17, 24, 39, 0.55)",
                  borderDash: [6, 6],
                  borderWidth: 2,
                },
              ],
            }
          : undefined,
    },
    scales: {
      x: { stacked: hasZones },
      y: {
        stacked: hasZones,
        beginAtZero: true,
        title: { display: true, text: "km" },
      },
    },
  };

  return <Bar data={data} options={options} />;
}

export function WeeklyElevationChart({ buckets }: { buckets: WeeklyBucket[] }) {
  return (
    <Bar
      data={{
        labels: buckets.map((bucket) => bucket.label),
        datasets: [
          {
            label: "D+",
            data: buckets.map((bucket) => bucket.elevationGain),
            backgroundColor: "rgba(16, 185, 129, 0.72)",
            borderRadius: 6,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "metres D+" } },
        },
      }}
    />
  );
}

export function PaceTrendChart({ points }: { points: PacePoint[] }) {
  const values = points.flatMap((point) => [
    point.pace,
    point.gap ?? point.pace,
  ]);
  const data: ChartData<"line", (number | null)[], string> = {
    labels: points.map((point) => point.date.slice(5)),
    datasets: [
      {
        label: "Pace",
        data: points.map((point) => point.pace),
        borderColor: "rgba(37, 99, 235, 0.35)",
        pointRadius: 2,
        tension: 0.25,
      },
      {
        label: "GAP",
        data: points.map((point) => point.gap),
        borderColor: "rgba(17, 24, 39, 0.85)",
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.25,
      },
      {
        label: "7-run avg",
        data: points.map((point) => point.rollingPace),
        borderColor: "rgb(37, 99, 235)",
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.35,
      },
    ],
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (item) =>
                `${item.dataset.label}: ${formatDashboardPace(Number(item.raw))}`,
              afterBody: (items) =>
                `${points[items[0]?.dataIndex ?? 0].distance.toFixed(1)} km`,
            },
          },
        },
        scales: {
          y: {
            reverse: true,
            min: Math.max(1, Math.min(...values) - 30),
            max: Math.max(...values) + 30,
            ticks: { callback: (value) => formatDashboardPace(Number(value)) },
          },
        },
      }}
    />
  );
}

export function HrTrendChart({
  points,
  maxHr,
}: {
  points: HrPoint[];
  maxHr: number | null;
}) {
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      annotation: maxHr
        ? {
            annotations: [
              {
                type: "line",
                yMin: maxHr * 0.81,
                yMax: maxHr * 0.81,
                borderColor: z2Color,
                borderDash: [5, 5],
              },
              {
                type: "line",
                yMin: maxHr * 0.9,
                yMax: maxHr * 0.9,
                borderColor: z3Color,
                borderDash: [5, 5],
              },
            ],
          }
        : undefined,
    },
    scales: {
      y: { beginAtZero: false, title: { display: true, text: "bpm" } },
    },
  };

  return (
    <Line
      data={{
        labels: points.map((point) => point.date.slice(5)),
        datasets: [
          {
            label: "7-run avg HR",
            data: points.map((point) => point.rollingHr),
            borderColor: "rgb(220, 38, 38)",
            borderWidth: 3,
            pointRadius: 1,
            tension: 0.35,
          },
        ],
      }}
      options={options}
    />
  );
}

export function FitnessPreviewChart({ points }: { points: FitnessPoint[] }) {
  return (
    <Line
      data={{
        labels: points.map((point) => point.date.slice(5)),
        datasets: [
          {
            label: "CTL",
            data: points.map((point) => point.ctl),
            borderColor: "rgb(37, 99, 235)",
            pointRadius: 0,
            tension: 0.3,
          },
          {
            label: "ATL",
            data: points.map((point) => point.atl),
            borderColor: "rgb(220, 38, 38)",
            pointRadius: 0,
            tension: 0.3,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
      }}
    />
  );
}
