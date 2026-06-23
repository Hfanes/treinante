"use client";

import type { PersonalRecordEvent } from "@/types";

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function startOfUtcWeek(date: Date) {
  const start = new Date(date);
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start;
}

function endOfUtcWeek(date: Date) {
  return addUtcDays(startOfUtcWeek(date), 6);
}

function prColor(count: number) {
  if (count <= 0) return "bg-[color-mix(in_oklch,var(--muted)_82%,white)]";
  if (count === 1) return "bg-[#65b54d]";
  if (count === 2) return "bg-[#f6bd3f]";
  if (count === 3) return "bg-[#ff8a1a]";
  return "bg-[#ef1119]";
}

export function PrTimelineChart({ events }: { events: PersonalRecordEvent[] }) {
  const datedEvents = events.filter((event) => event.achieved_at);
  const lastEventDate = datedEvents.at(-1)?.achieved_at;
  const endMonth = lastEventDate ? new Date(`${lastEventDate}T00:00:00Z`) : new Date();
  const monthStart = new Date(
    Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - 11, 1)
  );
  const monthEnd = new Date(
    Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, 0)
  );
  const start = startOfUtcWeek(monthStart);
  const end = endOfUtcWeek(monthEnd);
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const weekCount = Math.ceil(dayCount / 7);
  const days = Array.from({ length: dayCount }, (_, index) =>
    addUtcDays(start, index)
  );
  const eventsByDate = datedEvents.reduce((map, event) => {
    const date = event.achieved_at!;
    map.set(date, [...(map.get(date) ?? []), event]);
    return map;
  }, new Map<string, PersonalRecordEvent[]>());
  const monthLabels = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + index, 1)
    );
    return {
      label: monthLabel(month),
      column: Math.floor((month.getTime() - start.getTime()) / 86400000 / 7) + 1,
    };
  });
  const legend = [
    ["No PRs", 0],
    ["1 PR", 1],
    ["2 PRs", 2],
    ["3 PRs", 3],
    ["4+ PRs", 4],
  ] as const;

  return (
    <div
      className="overflow-x-auto pb-2"
      role="img"
      aria-label={`Calendar chart of ${events.length} personal records grouped by day.`}
    >
      <div className="min-w-[58rem]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="ui-label">PR count</p>
            <h3 className="instrument-heading mt-3 text-3xl text-[var(--bone)]">
              {monthLabel(monthStart)} {monthStart.getUTCFullYear()} - {" "}
              {monthLabel(monthEnd)} {monthEnd.getUTCFullYear()}
            </h3>
          </div>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Daily number of personal records hit.
          </p>
        </div>

        <div
          className="ml-9 grid gap-1 font-mono text-[0.68rem] text-[var(--muted-foreground)]"
          style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
        >
          {monthLabels.map((month) => (
            <span key={month.label} style={{ gridColumnStart: month.column }}>
              {month.label}
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[2rem_1fr] gap-3">
          <div className="grid grid-rows-7 gap-1 font-mono text-[0.68rem] text-[var(--muted-foreground)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div
            className="grid grid-flow-col grid-rows-7 gap-1"
            style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
          >
            {days.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const inRange = day >= monthStart && day <= monthEnd;
              const label = dayEvents.length
                ? `${key} - ${dayEvents.length} PR${dayEvents.length === 1 ? "" : "s"}: ${dayEvents.map((event) => event.type).join(", ")}`
                : `${key} - no PRs`;

              return (
                <span
                  aria-label={label}
                  className={`block h-3.5 rounded-[2px] ${
                    inRange ? prColor(dayEvents.length) : "bg-transparent"
                  }`}
                  key={key}
                  title={label}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[0.68rem] text-[var(--muted-foreground)]">
          {legend.map(([label, count]) => (
            <span className="inline-flex items-center gap-2" key={label}>
              <span className={`h-3.5 w-5 rounded-[2px] ${prColor(count)}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
