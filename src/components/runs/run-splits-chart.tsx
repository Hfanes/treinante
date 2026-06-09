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
import zoomPlugin from "chartjs-plugin-zoom";
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
  annotationPlugin,
  zoomPlugin
);

export function RunSplitsChart({ splits }: { splits: AnalyzedSplit[] }) {
  const hasHr = splits.some((split) => split.hr !== null);
  const hasElevation = splits.some((split) => split.elevation > 0);
  const paceValues = splits.flatMap((split) =>
    split.gap ? [split.pace, split.gap] : [split.pace]
  );
  const minPace = Math.max(1, Math.min(...paceValues) - 30);
  const maxPace = Math.max(...paceValues) + 30;
  const labels = splits.map((split) => String(split.km));
  const data: ChartData<"bar" | "line", (number | null)[], string> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Pace",
        data: splits.map((split) => split.pace),
        yAxisID: "pace",
        backgroundColor: "rgba(37, 99, 235, 0.72)",
        borderRadius: 6,
      },
      ...(hasElevation
        ? [
            {
              type: "line" as const,
              label: "GAP",
              data: splits.map((split) => split.gap),
              yAxisID: "pace",
              borderColor: "rgb(17, 24, 39)",
              borderDash: [6, 4],
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.3,
            },
            {
              type: "line" as const,
              label: "Elevation",
              data: splits.map((split) => split.elevation),
              yAxisID: "secondary",
              borderColor: "rgba(16, 185, 129, 0.7)",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              fill: true,
              pointRadius: 0,
              tension: 0.35,
            },
          ]
        : []),
      ...(hasHr
        ? [
            {
              type: "line" as const,
              label: "HR",
              data: splits.map((split) => split.hr),
              yAxisID: "secondary",
              borderColor: "rgb(220, 38, 38)",
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.3,
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
  const options: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          title: (items) => `km ${items[0]?.label ?? ""}`,
          label: (item) => {
            const value = Number(item.raw);
            if (!Number.isFinite(value)) return `${item.dataset.label}: -`;
            if (item.dataset.yAxisID === "pace") {
              return `${item.dataset.label}: ${formatPace(value)}`;
            }
            return item.dataset.label === "HR"
              ? `HR: ${Math.round(value)} bpm`
              : `Elevation: ${Math.round(value)} m`;
          },
        },
      },
      annotation: { annotations },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan: { enabled: true, mode: "x" },
      },
    },
    scales: {
      pace: {
        type: "linear",
        position: "left",
        reverse: true,
        min: minPace,
        max: maxPace,
        ticks: { callback: (value) => formatPace(Number(value)) },
        title: { display: true, text: "Pace" },
      },
      secondary: {
        type: "linear",
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: true, text: hasHr ? "HR / elevation" : "Elevation" },
      },
    },
  };

  return (
    <div className="h-[360px] w-full">
      <Chart type="bar" data={data} options={options} />
    </div>
  );
}
