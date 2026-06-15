import type { PersonalRecordType } from "@/types";

export interface PersonalRecordBadgeRecord {
  run_id: string | null;
  type: PersonalRecordType;
}

const badgeLabels: Record<PersonalRecordType, string> = {
  "400m": "400m PR",
  half_mile: "1/2 mi PR",
  "1_mile": "1 mi PR",
  "2_mile": "2 mi PR",
  "5k": "5K PR",
  "10_mile": "10 mi PR",
  "10k": "10K PR",
  "15k": "15K PR",
  "1k": "1K PR",
  "20k": "20K PR",
  half_marathon: "HM PR",
  "30k": "30K PR",
  marathon: "Marathon PR",
  "50k": "50K PR",
  "50_mile": "50 mi PR",
  "100k": "100K PR",
  "100_mile": "100 mi PR",
  "200k": "200K PR",
  "24h": "24h PR",
  "48h": "48h PR",
  longest_run: "Longest",
  longest_duration: "Duration",
  most_elevation: "Elevation",
  best_d_plus_per_km: "D+/km",
};

const badgePriority: Record<PersonalRecordType, number> = {
  half_marathon: 1,
  marathon: 2,
  "5k": 3,
  "10k": 4,
  "1_mile": 5,
  "400m": 6,
  half_mile: 7,
  "1k": 8,
  "2_mile": 9,
  "15k": 10,
  "10_mile": 11,
  "20k": 12,
  "30k": 13,
  "50k": 14,
  "50_mile": 15,
  "100k": 16,
  "100_mile": 17,
  "200k": 18,
  "24h": 19,
  "48h": 20,
  longest_run: 30,
  longest_duration: 31,
  most_elevation: 32,
  best_d_plus_per_km: 33,
};

export function buildPrBadgeMap(records: PersonalRecordBadgeRecord[]) {
  const byRun = new Map<string, PersonalRecordType[]>();

  for (const record of records) {
    if (!record.run_id) continue;
    byRun.set(record.run_id, [
      ...(byRun.get(record.run_id) ?? []),
      record.type,
    ]);
  }

  for (const [runId, types] of byRun) {
    byRun.set(
      runId,
      types.toSorted((a, b) => badgePriority[a] - badgePriority[b])
    );
  }

  return byRun;
}

export function formatPrBadgeLabel(types: PersonalRecordType[] | undefined) {
  if (!types?.length) return null;
  const first = badgeLabels[types[0]];
  const extraCount = types.length - 1;
  return extraCount > 0 ? `${first} +${extraCount}` : first;
}
