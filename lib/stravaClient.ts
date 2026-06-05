import type { Run } from "@/types";
import { notImplemented } from "./notImplemented";

export async function syncStravaRuns(_userId: string): Promise<Run[]> {
  void _userId;
  return notImplemented("Strava sync");
}
