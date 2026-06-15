"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  deleteCachedRun,
  getCachedExport,
  getCachedRuns,
  getSyncMeta,
  hydrateFromExport,
  parseExportFile,
  setSyncMeta,
  upsertCachedRun,
  upsertCachedRuns,
} from "@/lib/idb";
import { recalculateFitnessSnapshots } from "@/lib/calculations";
import { recalculatePersonalRecords } from "@/lib/prExtractor";
import { recalculateWeeklyReports } from "@/lib/reportEngine";
import { createBrowserClient } from "@/lib/supabase";
import type { ExportFile, Run } from "@/types";
import type { TablesInsert } from "@/types/supabase";

const RUN_SYNC_PREFIX = "runs_last_sync";
type RunInsert = TablesInsert<"runs">;

function sortRuns(runs: Run[]) {
  return [...runs].sort((a, b) => b.date.localeCompare(a.date));
}

function downloadJSON(file: ExportFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `runmetrics-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function readJSONFile(file: File) {
  return JSON.parse(await file.text()) as unknown;
}

function assertOwnImport(file: ExportFile, userId: string) {
  const rows = [
    ...file.runs,
    ...file.personal_records,
    ...file.segments,
    ...file.segment_efforts,
    ...file.weekly_reports,
  ];

  if (rows.some((row) => row.user_id !== userId)) {
    throw new Error("Import file contains data for a different user");
  }
}

export function useRuns(): {
  runs: Run[];
  loading: boolean;
  syncing: boolean;
  addRun: (run: Run) => Promise<void>;
  deleteRun: (id: string) => Promise<void>;
  getRun: (id: string) => Run | undefined;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
} {
  const { profile, user } = useAuth();
  const [supabase] = useState(createBrowserClient);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const syncRuns = useCallback(async () => {
    if (!user) {
      setRuns([]);
      setLoading(false);
      return;
    }

    setSyncing(true);

    try {
      const cachedRuns = await getCachedRuns(user.id);
      setRuns(cachedRuns);
      setLoading(cachedRuns.length === 0);

      const syncKey = `${RUN_SYNC_PREFIX}:${user.id}`;
      const lastSync = await getSyncMeta(syncKey);
      let query = supabase
        .from("runs")
        .select("*")
        .order("date", { ascending: false });

      if (lastSync) {
        query = query.gt("updated_at", lastSync);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const remoteRuns = (data ?? []) as unknown as Run[];

      if (remoteRuns.length > 0) {
        await upsertCachedRuns(remoteRuns);
      }

      const nextRuns = lastSync ? await getCachedRuns(user.id) : remoteRuns;
      setRuns(sortRuns(nextRuns));
      await setSyncMeta(syncKey, new Date().toISOString());
    } catch (err) {
      console.error("Run sync failed", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void syncRuns();
  }, [syncRuns]);

  const addRun = useCallback(
    async (run: Run) => {
      const { data, error } = await supabase
        .from("runs")
        .upsert(run as unknown as RunInsert)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const savedRun = data as unknown as Run;
      await recalculatePersonalRecords(supabase, savedRun.user_id);
      await recalculateFitnessSnapshots(supabase, savedRun.user_id);
      await recalculateWeeklyReports(supabase, savedRun.user_id);
      await upsertCachedRun(savedRun);
      setRuns((currentRuns) =>
        sortRuns([
          savedRun,
          ...currentRuns.filter((item) => item.id !== savedRun.id),
        ])
      );
    },
    [supabase]
  );

  const deleteRun = useCallback(
    async (id: string) => {
      const runToDelete = runs.find((run) => run.id === id);
      const { error } = await supabase.from("runs").delete().eq("id", id);

      if (error) {
        throw error;
      }

      if (runToDelete?.gpx_file_url) {
        const { error: storageError } = await supabase.storage
          .from("gpx")
          .remove([runToDelete.gpx_file_url]);

        if (storageError) {
          console.error("GPX file cleanup failed", storageError);
        }
      }

      if (user) {
        await recalculatePersonalRecords(supabase, user.id);
        await recalculateFitnessSnapshots(supabase, user.id);
        await recalculateWeeklyReports(supabase, user.id);
      }

      await deleteCachedRun(id);
      setRuns((currentRuns) => currentRuns.filter((run) => run.id !== id));
    },
    [runs, supabase]
  );

  const getRun = useCallback(
    (id: string) => runs.find((run) => run.id === id),
    [runs]
  );

  const exportJSON = useCallback(() => {
    void getCachedExport(profile).then(downloadJSON);
  }, [profile]);

  const importJSON = useCallback(
    async (file: File) => {
      if (!user) {
        throw new Error("Cannot import runs without an authenticated user");
      }

      const exportFile = parseExportFile(await readJSONFile(file));
      assertOwnImport(exportFile, user.id);

      await Promise.all([
        exportFile.runs.length > 0
          ? supabase
              .from("runs")
              .upsert(exportFile.runs as unknown as RunInsert[])
              .throwOnError()
          : Promise.resolve(),
        exportFile.personal_records.length > 0
          ? supabase
              .from("personal_records")
              .upsert(exportFile.personal_records)
              .throwOnError()
          : Promise.resolve(),
        exportFile.segments.length > 0
          ? supabase.from("segments").upsert(exportFile.segments).throwOnError()
          : Promise.resolve(),
        exportFile.segment_efforts.length > 0
          ? supabase
              .from("segment_efforts")
              .upsert(exportFile.segment_efforts)
              .throwOnError()
          : Promise.resolve(),
        exportFile.weekly_reports.length > 0
          ? supabase
              .from("weekly_reports")
              .upsert(exportFile.weekly_reports)
              .throwOnError()
          : Promise.resolve(),
      ]);

      await hydrateFromExport(exportFile);
      await recalculatePersonalRecords(supabase, user.id);
      await recalculateFitnessSnapshots(supabase, user.id);
      await recalculateWeeklyReports(supabase, user.id);
      setRuns(await getCachedRuns(user.id));
    },
    [supabase, user]
  );

  return {
    runs,
    loading,
    syncing,
    addRun,
    deleteRun,
    getRun,
    exportJSON,
    importJSON,
  };
}
