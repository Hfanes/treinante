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
const paceColor = "#f3d49b";
const gapColor = "#7f6d4d";
const hrColor = "#8f815f";
const ctlColor = "#f3d49b";
const atlColor = "#7f6d4d";
const hrZoneEasyColor = "#38f27d";
const hrZoneHardColor = "#ffb21a";
const elevColor = "oklch(0.45 0.03 80)";
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
            backgroundColor: paceColor,
            borderRadius: 0,
          },
        ],
  };
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    onClick: (_event, elements) => {
      const index = elements[0]?.index;
      if (index === undefined) return;
      const bucket = buckets[index];
      window.location.assign(
        `/runs?dateFrom=${bucket.start}&dateTo=${bucket.end}`
      );
    },
    plugins: {
      legend: chartPlugins.legend,
      tooltip: {
        ...chartPlugins.tooltip,
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
                  borderColor: "oklch(0.78 0.075 78 / 0.6)",
                  borderDash: [4, 4],
                  borderWidth: 1,
                },
              ],
            }
          : undefined,
    },
    scales: {
      x: { ...chartScales.x, stacked: hasZones },
      y: {
        ...chartScales.y,
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
            backgroundColor: elevColor,
            borderRadius: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: { ...chartPlugins, legend: { display: false } },
        scales: {
          ...chartScales,
          y: {
            ...chartScales.y,
            beginAtZero: true,
            title: { display: true, text: "metres D+" },
          },
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
        borderColor: "#fff0c4",
        borderWidth: 1,
        pointRadius: 2,
        tension: 0.3,
      },
      {
        label: "GAP",
        data: points.map((point) => point.gap),
        borderColor: gapColor,
        borderDash: [4, 4],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "7-run avg",
        data: points.map((point) => point.rollingPace),
        borderColor: paceColor,
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: {
          legend: chartPlugins.legend,
          tooltip: {
            ...chartPlugins.tooltip,
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
            ...chartScales.y,
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
    animation: { duration: 600, easing: "easeOutQuart" },
    plugins: {
      legend: chartPlugins.legend,
      annotation: maxHr
        ? {
            annotations: [
              {
                type: "line",
                yMin: maxHr * 0.81,
                yMax: maxHr * 0.81,
                borderColor: hrZoneEasyColor,
                borderDash: [6, 4],
                borderWidth: 2,
              },
              {
                type: "line",
                yMin: maxHr * 0.9,
                yMax: maxHr * 0.9,
                borderColor: hrZoneHardColor,
                borderDash: [6, 4],
                borderWidth: 2,
              },
            ],
          }
        : undefined,
    },
    scales: {
      ...chartScales,
      y: {
        ...chartScales.y,
        beginAtZero: false,
        title: { display: true, text: "bpm" },
      },
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
            borderColor: hrColor,
            borderWidth: 3,
            pointBackgroundColor: hrColor,
            pointBorderColor: "#f3d49b",
            pointRadius: 2.5,
            pointHoverRadius: 4,
            tension: 0.3,
          },
        ],
      }}
      options={options}
    />
  );
}

export function FitnessPreviewChart({ points }: { points: FitnessPoint[] }) {
  return (
    <div className="vbars-dense h-full rounded-[2px] bg-[color-mix(in_oklch,var(--card)_88%,black)] p-4">
      <div className="mb-3 flex flex-wrap justify-end gap-5 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#f3d49b]">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-8 bg-[#f3d49b]" aria-hidden="true" />
          CTL - Fitness
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-8 bg-[#7f6d4d]" aria-hidden="true" />
          ATL - Fatigue
        </span>
      </div>
      <div className="h-[calc(100%-2.25rem)]">
        <Line
          data={{
            labels: points.map((point) => point.date.slice(5)),
            datasets: [
              {
                label: "CTL",
                data: points.map((point) => point.ctl),
                borderColor: ctlColor,
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.34,
              },
              {
                label: "ATL",
                data: points.map((point) => point.atl),
                borderColor: atlColor,
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.18,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: "easeOutQuart" },
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...chartPlugins.tooltip,
                callbacks: {
                  title: (items) =>
                    points[items[0]?.dataIndex ?? 0]?.date ?? "",
                  label: (item) =>
                    `${item.dataset.label}: ${Number(item.raw).toFixed(1)}`,
                },
              },
            },
            scales: {
              x: { display: false, grid: { display: false } },
              y: { display: false, grid: { display: false } },
            },
          }}
        />
      </div>
    </div>
  );
}
