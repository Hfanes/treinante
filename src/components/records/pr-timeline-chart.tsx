"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

import type { PersonalRecordEvent } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

export function PrTimelineChart({ events }: { events: PersonalRecordEvent[] }) {
  const recent = events.slice(-20);
  const data: ChartData<"line"> = {
    labels: recent.map((event) => event.achieved_at ?? "-"),
    datasets: [
      {
        label: "PR value",
        data: recent.map((event) => event.value),
        borderColor: "#f3d49b",
        backgroundColor: "#f3d49b",
        pointRadius: 3,
        tension: 0.25,
      },
    ],
  };
  const options: ChartOptions<"line"> = {
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (item) => {
            const event = recent[item.dataIndex];
            return `${event.type}: ${event.value.toFixed(1)}${event.estimated ? " estimated" : ""}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: "#8f815f" }, grid: { color: "#4a4438" } },
      y: { ticks: { color: "#8f815f" }, grid: { color: "#4a4438" } },
    },
  };

  return (
    <div
      className="h-72"
      role="img"
      aria-label={`Timeline of ${events.length} personal record improvements.`}
    >
      <Line data={data} options={options} />
    </div>
  );
}
