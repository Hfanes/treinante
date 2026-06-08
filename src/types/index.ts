export type RunSource = "gpx" | "strava" | "manual";
export type EffortZone = "z2" | "z3" | "z4";

export interface Split {
  km: number;
  pace: number;
  hr: number | null;
  elevation: number;
  gap: number;
  is_stop: boolean;
  lat: number | null;
  lng: number | null;
  timestamp?: string;
}

export interface Run {
  id: string;
  user_id: string;
  title: string | null;
  date: string;
  start_time: string | null;
  source: RunSource;
  sport_type: string | null;
  strava_activity_id: number | null;
  distance: number;
  total_time: number;
  moving_time: number;
  avg_hr: number | null;
  max_hr: number | null;
  avg_power: number | null;
  max_power: number | null;
  elevation_gain: number;
  elevation_loss: number;
  avg_pace: number;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  summary_polyline: string | null;
  gpx_file_url: string | null;
  raw_splits: Split[];
  raw_source: Record<string, unknown>;
  training_load: number | null;
  ctl_at_date: number | null;
  atl_at_date: number | null;
  tsb_at_date: number | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  weekly_km_goal: number;
  max_hr: number | null;
  resting_hr: number | null;
  ftp_pace: number | null;
  strava_connected: boolean;
  onboarding_complete: boolean;
}

export type PersonalRecordType =
  | "1k"
  | "5k"
  | "10k"
  | "21k"
  | "42k"
  | "longest_run"
  | "most_elevation"
  | "best_d_plus_per_km";

export interface PersonalRecord {
  id: string;
  user_id: string;
  type: PersonalRecordType;
  value: number;
  run_id: string | null;
  achieved_at: string | null;
  updated_at: string;
}

export interface Segment {
  id: string;
  user_id: string;
  name: string;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  distance: number | null;
  best_time: number | null;
  best_date: string | null;
  kom_time: number | null;
  strava_segment_id: number | null;
  created_at: string;
}

export interface SegmentEffort {
  id: string;
  user_id: string;
  segment_id: string;
  run_id: string;
  elapsed_time: number;
  avg_hr: number | null;
  date: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  total_km: number;
  total_d_plus: number | null;
  total_time: number;
  num_runs: number;
  avg_pace: number;
  avg_hr: number | null;
  ctl_end: number | null;
  atl_end: number | null;
  tsb_end: number | null;
  vs_prev_km_delta: number | null;
  vs_prev_d_plus_delta: number | null;
  vs_prev_time_delta: number | null;
  zone_breakdown: Record<EffortZone, number> | null;
  insight_text: string | null;
  generated_at: string;
}

export interface FitnessPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface ExportFile {
  exported_at: string;
  version: 2;
  profile: Partial<Profile> | null;
  runs: Run[];
  personal_records: PersonalRecord[];
  segments: Segment[];
  segment_efforts: SegmentEffort[];
  weekly_reports: WeeklyReport[];
}
