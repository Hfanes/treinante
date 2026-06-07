import type { Run } from "@/types";
import { notImplemented } from "./notImplemented";

export function parseGPX(
  _xmlString: string
): Omit<Run, "id" | "user_id" | "created_at"> {
  void _xmlString;
  return notImplemented("GPX parser");
}
