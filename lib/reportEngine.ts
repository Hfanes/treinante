import type { Profile, Run, WeeklyReport } from "@/types";
import { notImplemented } from "./notImplemented";

export async function regenerateWeeklyReport(
  _userId: string,
  _weekDate: string,
  _runs: Run[],
  _profile: Profile
): Promise<WeeklyReport> {
  void _userId;
  void _weekDate;
  void _runs;
  void _profile;
  return notImplemented("Weekly report generation");
}
