"use client";

import type { Run } from "@/types";

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
  const unimplemented = async () => {
    throw new Error("Runs data layer is not implemented yet");
  };

  return {
    runs: [],
    loading: false,
    syncing: false,
    addRun: unimplemented,
    deleteRun: unimplemented,
    getRun: () => undefined,
    exportJSON: () => {
      throw new Error("Runs data layer is not implemented yet");
    },
    importJSON: unimplemented,
  };
}
