export const TOOL_DISTANCES = [
  { key: "5k", label: "5 km", distanceKm: 5 },
  { key: "10k", label: "10 km", distanceKm: 10 },
  { key: "half", label: "Half marathon", distanceKm: 21.0975 },
  { key: "marathon", label: "Marathon", distanceKm: 42.195 },
] as const;

export type ToolDistanceKey = (typeof TOOL_DISTANCES)[number]["key"];

export function finishSeconds(paceSecPerKm: number, distanceKm: number) {
  if (paceSecPerKm <= 0 || distanceKm <= 0) return 0;
  return Math.round(paceSecPerKm * distanceKm);
}

export function gelKm(triggerMinutes: number, paceSecPerKm: number) {
  if (triggerMinutes <= 0 || paceSecPerKm <= 0) return null;
  return (triggerMinutes * 60) / paceSecPerKm;
}

export function buildGelSchedule(
  finishTimeSeconds: number,
  paceSecPerKm: number
) {
  const gels = [
    { label: "Gel 1", type: "No caffeine", minute: 45, optional: false },
    { label: "Gel 2", type: "With caffeine", minute: 80, optional: false },
    { label: "Gel 3", type: "With caffeine", minute: 110, optional: false },
    { label: "Gel 4", type: "With caffeine", minute: 145, optional: true },
  ];

  return gels
    .filter((gel) => finishTimeSeconds >= gel.minute * 60)
    .map((gel) => ({
      ...gel,
      km: gelKm(gel.minute, paceSecPerKm),
    }));
}

export function classifyHill(elevationM: number, distanceM: number) {
  const safeDistance = Math.max(distanceM, 1);
  const gradient = (elevationM / safeDistance) * 100;
  const dPlusPerKm = (elevationM / safeDistance) * 1000;
  const classification =
    gradient < 5
      ? {
          label: "Flat",
          color: "green",
          description:
            "Minimal elevation - pacing will be consistent throughout.",
        }
      : gradient < 10
        ? {
            label: "Moderate",
            color: "lime",
            description:
              "Gentle incline. Good for threshold runs and hill repeats.",
          }
        : gradient < 20
          ? {
              label: "Demanding",
              color: "amber",
              description:
                "Significant climb. Expect a noticeable slowdown. Strength and form work.",
            }
          : gradient < 40
            ? {
                label: "Steep trail",
                color: "orange",
                description:
                  "Technical and steep. Walk-run strategy typical at race pace.",
              }
            : {
                label: "Extreme",
                color: "red",
                description:
                  "Very steep terrain. Hands-on-knees territory. Specific trail or vertical km training.",
              };

  return {
    gradient,
    dPlusPerKm,
    classification,
    suitableForHillRepeats: gradient >= 6 && gradient <= 10,
    suitableForHillSprints: gradient >= 8 && gradient <= 15,
  };
}

export function computeZones(lthr: number) {
  const safeLthr = Math.max(1, Math.round(lthr));

  return {
    z1: { min: 0, max: Math.round(safeLthr * 0.8), label: "Recovery" },
    z2: {
      min: Math.round(safeLthr * 0.8),
      max: Math.round(safeLthr * 0.89),
      label: "Aerobic",
    },
    z3: {
      min: Math.round(safeLthr * 0.89),
      max: Math.round(safeLthr * 0.93),
      label: "Tempo",
    },
    z4: {
      min: Math.round(safeLthr * 0.93),
      max: Math.round(safeLthr),
      label: "Threshold",
    },
    z5: {
      min: Math.round(safeLthr),
      max: 220,
      label: "VO2max / Hard",
    },
  };
}

export function estimatedMaxHrFromLthr(lthr: number) {
  if (lthr <= 0) return null;
  return Math.round(lthr / 0.95);
}
