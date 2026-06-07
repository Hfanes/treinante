import type { PersonalRecord, Profile, Run } from "@/types";
import { notImplemented } from "./notImplemented";

export async function extractAndUpdatePRs(
  _run: Run,
  _userId: string,
  _profile: Profile
): Promise<PersonalRecord[]> {
  void _run;
  void _userId;
  void _profile;
  return notImplemented("Personal record extraction");
}
