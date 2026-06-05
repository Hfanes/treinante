import { openDB, type DBSchema } from "idb";
import type {
  PersonalRecord,
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
