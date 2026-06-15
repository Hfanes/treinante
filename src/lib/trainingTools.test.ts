import { describe, expect, it } from "vitest";

import {
  buildGelSchedule,
  classifyHill,
  computeZones,
  estimatedMaxHrFromLthr,
  finishSeconds,
  gelKm,
} from "./trainingTools";

describe("training tools calculations", () => {
  it("calculates finish times from pace and distance", () => {
    expect(finishSeconds(330, 5)).toBe(1650);
    expect(finishSeconds(330, 21.0975)).toBe(6962);
  });

  it("builds gel schedules from finish time thresholds", () => {
    expect(buildGelSchedule(44 * 60, 330)).toHaveLength(0);
    expect(buildGelSchedule(79 * 60, 330).map((gel) => gel.label)).toEqual([
      "Gel 1",
    ]);
    expect(buildGelSchedule(145 * 60, 330).map((gel) => gel.label)).toEqual([
      "Gel 1",
      "Gel 2",
      "Gel 3",
      "Gel 4",
    ]);
    expect(gelKm(45, 330)?.toFixed(1)).toBe("8.2");
  });

  it("classifies hills and training suitability", () => {
    const hill = classifyHill(120, 1000);

    expect(hill.gradient).toBe(12);
    expect(hill.dPlusPerKm).toBe(120);
    expect(hill.classification.label).toBe("Demanding");
    expect(hill.suitableForHillRepeats).toBe(false);
    expect(hill.suitableForHillSprints).toBe(true);
  });

  it("computes heart-rate zones from LTHR", () => {
    expect(computeZones(168)).toMatchObject({
      z1: { min: 0, max: 134, label: "Recovery" },
      z2: { min: 134, max: 150, label: "Aerobic" },
      z3: { min: 150, max: 156, label: "Tempo" },
      z4: { min: 156, max: 168, label: "Threshold" },
      z5: { min: 168, max: 220, label: "VO2max / Hard" },
    });
  });

  it("estimates max HR from LTHR", () => {
    expect(estimatedMaxHrFromLthr(168)).toBe(177);
    expect(estimatedMaxHrFromLthr(0)).toBeNull();
  });
});
