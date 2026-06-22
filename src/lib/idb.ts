import { openDB, type DBSchema } from "idb";
import type {
  ExportFile,
  PersonalRecordType,
  PersonalRecord,
  Profile,
  Run,
  RunSource,
  Segment,
  SegmentEffort,
  WeeklyReport,
} from "@/types";

const EXPORT_ARRAY_LIMIT = 10_000;
const RUN_SOURCES = ["gpx", "strava", "manual"] satisfies RunSource[];
const PERSONAL_RECORD_TYPES = [
  "400m",
  "half_mile",
  "1k",
  "1_mile",
  "2_mile",
  "5k",
  "10k",
  "15k",
  "10_mile",
  "20k",
  "half_marathon",
  "30k",
  "marathon",
  "50k",
  "50_mile",
  "100k",
  "100_mile",
  "200k",
  "24h",
  "48h",
  "longest_run",
  "longest_duration",
  "most_elevation",
  "best_d_plus_per_km",
] satisfies PersonalRecordType[];

interface TreinanteDB extends DBSchema {
  runs: {
    key: string;
    value: Run;
    indexes: { by_date: string; by_user: string };
  };
  personal_records: {
    key: string;
    value: PersonalRecord;
    indexes: { by_user_type: [string, string] };
  };
  segments: { key: string; value: Segment };
  segment_efforts: {
    key: string;
    value: SegmentEffort;
    indexes: { by_segment: string };
  };
  weekly_reports: {
    key: string;
    value: WeeklyReport;
    indexes: { by_week: string };
  };
  sync_meta: { key: string; value: { key: string; value: string } };
}

export function openTreinanteDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }

  return openDB<TreinanteDB>("treinante", 1, {
    upgrade(db) {
      const runs = db.createObjectStore("runs", { keyPath: "id" });
      runs.createIndex("by_date", "date");
      runs.createIndex("by_user", "user_id");

      const records = db.createObjectStore("personal_records", {
        keyPath: "id",
      });
      records.createIndex("by_user_type", ["user_id", "type"], {
        unique: true,
      });

      db.createObjectStore("segments", { keyPath: "id" });

      const efforts = db.createObjectStore("segment_efforts", {
        keyPath: "id",
      });
      efforts.createIndex("by_segment", "segment_id");

      const reports = db.createObjectStore("weekly_reports", { keyPath: "id" });
      reports.createIndex("by_week", "week_start");

      db.createObjectStore("sync_meta", { keyPath: "key" });
    },
  });
}

let dbPromise: ReturnType<typeof openTreinanteDB> | null = null;

function getDB() {
  dbPromise ??= openTreinanteDB();
  return dbPromise;
}

export async function getCachedRuns(userId: string) {
  const database = await getDB();
  const runs = await database.getAllFromIndex("runs", "by_user", userId);
  return runs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getCachedRun(id: string) {
  const database = await getDB();
  return database.get("runs", id);
}

export async function upsertCachedRuns(runs: Run[]) {
  const database = await getDB();
  const tx = database.transaction("runs", "readwrite");
  await Promise.all(runs.map((run) => tx.store.put(run)));
  await tx.done;
}

export async function upsertCachedRun(run: Run) {
  const database = await getDB();
  await database.put("runs", run);
}

export async function upsertCachedPersonalRecords(records: PersonalRecord[]) {
  const database = await getDB();
  const tx = database.transaction("personal_records", "readwrite");
  const userIds = new Set(records.map((record) => record.user_id));
  const existing = await tx.store.getAll();

  await Promise.all(
    existing
      .filter((record) => userIds.has(record.user_id))
      .map((record) => tx.store.delete(record.id))
  );
  await Promise.all(records.map((record) => tx.store.put(record)));
  await tx.done;
}

export async function upsertCachedWeeklyReports(reports: WeeklyReport[]) {
  const database = await getDB();
  const tx = database.transaction("weekly_reports", "readwrite");
  await Promise.all(reports.map((report) => tx.store.put(report)));
  await tx.done;
}

export async function deleteCachedRun(id: string) {
  const database = await getDB();
  await database.delete("runs", id);
}

export async function deleteCachedRunsBySource(
  userId: string,
  source: Run["source"]
) {
  const database = await getDB();
  const runs = await database.getAllFromIndex("runs", "by_user", userId);
  const tx = database.transaction("runs", "readwrite");
  await Promise.all(
    runs
      .filter((run) => run.source === source)
      .map((run) => tx.store.delete(run.id))
  );
  await tx.done;
}

export async function getSyncMeta(key: string) {
  const database = await getDB();
  return (await database.get("sync_meta", key))?.value ?? null;
}

export async function setSyncMeta(key: string, value: string) {
  const database = await getDB();
  await database.put("sync_meta", { key, value });
}

export async function getCachedExport(
  profile: Partial<Profile> | null
): Promise<ExportFile> {
  const database = await getDB();
  const userId = profile?.id;
  const [runs, personalRecords, segments, segmentEfforts, weeklyReports] =
    await Promise.all([
      database.getAll("runs"),
      database.getAll("personal_records"),
      database.getAll("segments"),
      database.getAll("segment_efforts"),
      database.getAll("weekly_reports"),
    ]);

  return {
    exported_at: new Date().toISOString(),
    version: 2,
    profile,
    runs: userId ? runs.filter((run) => run.user_id === userId) : runs,
    personal_records: userId
      ? personalRecords.filter((record) => record.user_id === userId)
      : personalRecords,
    segments: userId
      ? segments.filter((segment) => segment.user_id === userId)
      : segments,
    segment_efforts: userId
      ? segmentEfforts.filter((effort) => effort.user_id === userId)
      : segmentEfforts,
    weekly_reports: userId
      ? weeklyReports.filter((report) => report.user_id === userId)
      : weeklyReports,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isDate(value: unknown) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function isTimestamp(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNumberInRange(value: unknown, min: number, max: number) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function isOptionalText(value: unknown, maxLength: number) {
  return (
    value === null || (typeof value === "string" && value.length <= maxLength)
  );
}

function isOptionalIntegerInRange(value: unknown, min: number, max: number) {
  return (
    value === null ||
    (Number.isInteger(value) && Number(value) >= min && Number(value) <= max)
  );
}

function isOptionalNumberInRange(value: unknown, min: number, max: number) {
  return value === null || isNumberInRange(value, min, max);
}

function validateSplit(value: unknown, index: number) {
  assertValid(isRecord(value), `Invalid split at index ${index}`);
  assertValid(
    isNumberInRange(value.km, 1, 1000),
    `Invalid split km at index ${index}`
  );
  assertValid(
    isNumberInRange(value.pace, 1, 86400),
    `Invalid split pace at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.hr, 1, 250),
    `Invalid split HR at index ${index}`
  );
  assertValid(
    typeof value.elevation === "number" && Number.isFinite(value.elevation),
    `Invalid split elevation at index ${index}`
  );
  assertValid(
    isNumberInRange(value.gap, 1, 86400),
    `Invalid split GAP at index ${index}`
  );
  assertValid(
    typeof value.is_stop === "boolean",
    `Invalid split stop flag at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.lat, -90, 90),
    `Invalid split latitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.lng, -180, 180),
    `Invalid split longitude at index ${index}`
  );
  assertValid(
    value.timestamp === undefined || isTimestamp(value.timestamp),
    `Invalid split timestamp at index ${index}`
  );
}

function validateRun(value: unknown, index: number) {
  assertValid(isRecord(value), `Invalid run at index ${index}`);
  assertValid(isUuid(value.id), `Invalid run id at index ${index}`);
  assertValid(isUuid(value.user_id), `Invalid run user at index ${index}`);
  assertValid(
    isOptionalText(value.title, 200),
    `Invalid run title at index ${index}`
  );
  assertValid(isDate(value.date), `Invalid run date at index ${index}`);
  assertValid(
    value.start_time === null || isTimestamp(value.start_time),
    `Invalid run start time at index ${index}`
  );
  assertValid(
    typeof value.source === "string" &&
      RUN_SOURCES.includes(value.source as RunSource),
    `Invalid run source at index ${index}`
  );
  assertValid(
    isOptionalText(value.sport_type, 50),
    `Invalid run sport type at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(
      value.strava_activity_id,
      1,
      Number.MAX_SAFE_INTEGER
    ),
    `Invalid Strava id at index ${index}`
  );
  assertValid(
    isNumberInRange(value.distance, 0.001, 1000),
    `Invalid run distance at index ${index}`
  );
  assertValid(
    isNumberInRange(value.total_time, 1, 604800),
    `Invalid run total time at index ${index}`
  );
  assertValid(
    isNumberInRange(value.moving_time, 1, Number(value.total_time)),
    `Invalid run moving time at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.avg_hr, 1, 250),
    `Invalid run average HR at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.max_hr, 1, 250),
    `Invalid run max HR at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.avg_power, 1, 5000),
    `Invalid run average power at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.max_power, 1, 5000),
    `Invalid run max power at index ${index}`
  );
  assertValid(
    isNumberInRange(value.elevation_gain, 0, 100000),
    `Invalid run elevation gain at index ${index}`
  );
  assertValid(
    isNumberInRange(value.elevation_loss, 0, 100000),
    `Invalid run elevation loss at index ${index}`
  );
  assertValid(
    isNumberInRange(value.avg_pace, 1, 86400),
    `Invalid run pace at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.start_lat, -90, 90),
    `Invalid run start latitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.start_lng, -180, 180),
    `Invalid run start longitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.end_lat, -90, 90),
    `Invalid run end latitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.end_lng, -180, 180),
    `Invalid run end longitude at index ${index}`
  );
  assertValid(
    isOptionalText(value.summary_polyline, 10000),
    `Invalid run polyline at index ${index}`
  );
  assertValid(
    isOptionalText(value.gpx_file_url, 500),
    `Invalid run GPX file at index ${index}`
  );
  assertValid(
    Array.isArray(value.raw_splits) &&
      value.raw_splits.length <= EXPORT_ARRAY_LIMIT,
    `Invalid run splits at index ${index}`
  );
  value.raw_splits.forEach(validateSplit);
  assertValid(
    isRecord(value.raw_source),
    `Invalid run raw source at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.training_load, 0, 100000),
    `Invalid run training load at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.ctl_at_date, -100000, 100000),
    `Invalid run CTL at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.atl_at_date, -100000, 100000),
    `Invalid run ATL at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.tsb_at_date, -100000, 100000),
    `Invalid run TSB at index ${index}`
  );
  assertValid(
    isTimestamp(value.created_at),
    `Invalid run created time at index ${index}`
  );
  assertValid(
    isTimestamp(value.updated_at),
    `Invalid run updated time at index ${index}`
  );
}

function validatePersonalRecord(value: unknown, index: number) {
  assertValid(isRecord(value), `Invalid personal record at index ${index}`);
  assertValid(isUuid(value.id), `Invalid personal record id at index ${index}`);
  assertValid(
    isUuid(value.user_id),
    `Invalid personal record user at index ${index}`
  );
  assertValid(
    typeof value.type === "string" &&
      PERSONAL_RECORD_TYPES.includes(value.type as PersonalRecordType),
    `Invalid personal record type at index ${index}`
  );
  assertValid(
    isNumberInRange(value.value, 0.001, 1_000_000),
    `Invalid personal record value at index ${index}`
  );
  assertValid(
    value.run_id === null || isUuid(value.run_id),
    `Invalid personal record run at index ${index}`
  );
  assertValid(
    value.achieved_at === null || isDate(value.achieved_at),
    `Invalid personal record date at index ${index}`
  );
  assertValid(
    typeof value.estimated === "boolean",
    `Invalid personal record estimated flag at index ${index}`
  );
  assertValid(
    isTimestamp(value.updated_at),
    `Invalid personal record update time at index ${index}`
  );
}

function validateSegment(value: unknown, index: number) {
  assertValid(isRecord(value), `Invalid segment at index ${index}`);
  assertValid(isUuid(value.id), `Invalid segment id at index ${index}`);
  assertValid(isUuid(value.user_id), `Invalid segment user at index ${index}`);
  assertValid(
    typeof value.name === "string" &&
      value.name.length > 0 &&
      value.name.length <= 120,
    `Invalid segment name at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.start_lat, -90, 90),
    `Invalid segment start latitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.start_lng, -180, 180),
    `Invalid segment start longitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.end_lat, -90, 90),
    `Invalid segment end latitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.end_lng, -180, 180),
    `Invalid segment end longitude at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.distance, 0.001, 1000),
    `Invalid segment distance at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.best_time, 1, 604800),
    `Invalid segment best time at index ${index}`
  );
  assertValid(
    value.best_date === null || isDate(value.best_date),
    `Invalid segment best date at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.kom_time, 1, 604800),
    `Invalid segment KOM time at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(
      value.strava_segment_id,
      1,
      Number.MAX_SAFE_INTEGER
    ),
    `Invalid Strava segment id at index ${index}`
  );
  assertValid(
    isTimestamp(value.created_at),
    `Invalid segment created time at index ${index}`
  );
}

function validateSegmentEffort(value: unknown, index: number) {
  assertValid(isRecord(value), `Invalid segment effort at index ${index}`);
  assertValid(isUuid(value.id), `Invalid segment effort id at index ${index}`);
  assertValid(
    isUuid(value.user_id),
    `Invalid segment effort user at index ${index}`
  );
  assertValid(
    isUuid(value.segment_id),
    `Invalid segment effort segment at index ${index}`
  );
  assertValid(
    isUuid(value.run_id),
    `Invalid segment effort run at index ${index}`
  );
  assertValid(
    isNumberInRange(value.elapsed_time, 1, 604800),
    `Invalid segment effort elapsed time at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.avg_hr, 1, 250),
    `Invalid segment effort HR at index ${index}`
  );
  assertValid(
    isDate(value.date),
    `Invalid segment effort date at index ${index}`
  );
}

function validateWeeklyReport(value: unknown, index: number) {
  assertValid(isRecord(value), `Invalid weekly report at index ${index}`);
  assertValid(isUuid(value.id), `Invalid weekly report id at index ${index}`);
  assertValid(
    isUuid(value.user_id),
    `Invalid weekly report user at index ${index}`
  );
  assertValid(
    isDate(value.week_start),
    `Invalid weekly report week at index ${index}`
  );
  assertValid(
    isNumberInRange(value.total_km, 0, 1000),
    `Invalid weekly report km at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.total_d_plus, 0, 100000),
    `Invalid weekly report D+ at index ${index}`
  );
  assertValid(
    isNumberInRange(value.total_time, 0, 604800),
    `Invalid weekly report time at index ${index}`
  );
  assertValid(
    isNumberInRange(value.num_runs, 0, EXPORT_ARRAY_LIMIT),
    `Invalid weekly report run count at index ${index}`
  );
  assertValid(
    isNumberInRange(value.avg_pace, 1, 86400),
    `Invalid weekly report pace at index ${index}`
  );
  assertValid(
    isOptionalIntegerInRange(value.avg_hr, 1, 250),
    `Invalid weekly report HR at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.ctl_end, -100000, 100000),
    `Invalid weekly report CTL at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.atl_end, -100000, 100000),
    `Invalid weekly report ATL at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.tsb_end, -100000, 100000),
    `Invalid weekly report TSB at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.vs_prev_km_delta, -1000, 1000),
    `Invalid weekly report km delta at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.vs_prev_d_plus_delta, -100000, 100000),
    `Invalid weekly report D+ delta at index ${index}`
  );
  assertValid(
    isOptionalNumberInRange(value.vs_prev_time_delta, -604800, 604800),
    `Invalid weekly report time delta at index ${index}`
  );
  assertValid(
    value.zone_breakdown === null || isRecord(value.zone_breakdown),
    `Invalid weekly report zones at index ${index}`
  );
  assertValid(
    isOptionalText(value.insight_text, 2000),
    `Invalid weekly report insight at index ${index}`
  );
  assertValid(
    isTimestamp(value.generated_at),
    `Invalid weekly report generated time at index ${index}`
  );
}

export function parseExportFile(value: unknown): ExportFile {
  if (!isRecord(value) || value.version !== 2) {
    throw new Error("Unsupported import file version");
  }

  const requiredArrays = [
    "runs",
    "personal_records",
    "segments",
    "segment_efforts",
    "weekly_reports",
  ] as const;

  for (const key of requiredArrays) {
    if (!Array.isArray(value[key])) {
      throw new Error(`Import file is missing ${key}`);
    }

    if (value[key].length > EXPORT_ARRAY_LIMIT) {
      throw new Error(`Import file has too many ${key}`);
    }
  }

  const runs = value.runs as unknown[];
  const personalRecords = value.personal_records as unknown[];
  const segments = value.segments as unknown[];
  const segmentEfforts = value.segment_efforts as unknown[];
  const weeklyReports = value.weekly_reports as unknown[];

  runs.forEach(validateRun);
  personalRecords.forEach(validatePersonalRecord);
  segments.forEach(validateSegment);
  segmentEfforts.forEach(validateSegmentEffort);
  weeklyReports.forEach(validateWeeklyReport);

  return value as unknown as ExportFile;
}

export async function hydrateFromExport(file: ExportFile) {
  const database = await getDB();
  const tx = database.transaction(
    [
      "runs",
      "personal_records",
      "segments",
      "segment_efforts",
      "weekly_reports",
    ],
    "readwrite"
  );

  await Promise.all([
    ...file.runs.map((run) => tx.objectStore("runs").put(run)),
    ...file.personal_records.map((record) =>
      tx.objectStore("personal_records").put(record)
    ),
    ...file.segments.map((segment) => tx.objectStore("segments").put(segment)),
    ...file.segment_efforts.map((effort) =>
      tx.objectStore("segment_efforts").put(effort)
    ),
    ...file.weekly_reports.map((report) =>
      tx.objectStore("weekly_reports").put(report)
    ),
  ]);

  await tx.done;
}
