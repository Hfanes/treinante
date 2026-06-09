import { openDB, type DBSchema } from "idb";
import type {
  ExportFile,
  PersonalRecord,
  Profile,
  Run,
  Segment,
  SegmentEffort,
  WeeklyReport,
} from "@/types";

interface RunMetricsDB extends DBSchema {
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

export function openRunMetricsDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }

  return openDB<RunMetricsDB>("runmetrics", 1, {
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

let dbPromise: ReturnType<typeof openRunMetricsDB> | null = null;

function getDB() {
  dbPromise ??= openRunMetricsDB();
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
  }

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
