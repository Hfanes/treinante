import type { FitnessPoint, Profile, Run } from "@/types";
import { notImplemented } from "./notImplemented";

export function computeTrainingLoad(_run: Run, _profile: Profile): number {
  void _run;
  void _profile;
  return notImplemented("Training load calculation");
}

export function computeFitnessTimeSeries(
  _runs: Run[],
  _profile: Profile
): FitnessPoint[] {
  void _runs;
  void _profile;
  return notImplemented("Fitness time series calculation");
}
