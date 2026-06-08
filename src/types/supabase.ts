export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      personal_records: {
        Row: {
          achieved_at: string | null;
          id: string;
          run_id: string | null;
          type: string;
          updated_at: string;
          user_id: string;
          value: number;
        };
        Insert: {
          achieved_at?: string | null;
          id?: string;
          run_id?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
          value: number;
        };
        Update: {
          achieved_at?: string | null;
          id?: string;
          run_id?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "personal_records_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          ftp_pace: number | null;
          id: string;
          max_hr: number | null;
          name: string | null;
          onboarding_complete: boolean;
          resting_hr: number | null;
          strava_connected: boolean;
          weekly_km_goal: number;
        };
        Insert: {
          created_at?: string;
          ftp_pace?: number | null;
          id: string;
          max_hr?: number | null;
          name?: string | null;
          onboarding_complete?: boolean;
          resting_hr?: number | null;
          strava_connected?: boolean;
          weekly_km_goal?: number;
        };
        Update: {
          created_at?: string;
          ftp_pace?: number | null;
          id?: string;
          max_hr?: number | null;
          name?: string | null;
          onboarding_complete?: boolean;
          resting_hr?: number | null;
          strava_connected?: boolean;
          weekly_km_goal?: number;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          atl_at_date: number | null;
          avg_hr: number | null;
          avg_pace: number;
          avg_power: number | null;
          created_at: string;
          ctl_at_date: number | null;
          date: string;
          distance: number;
          elevation_gain: number;
          elevation_loss: number;
          end_lat: number | null;
          end_lng: number | null;
          gpx_file_url: string | null;
          id: string;
          max_hr: number | null;
          max_power: number | null;
          moving_time: number;
          raw_source: Json;
          raw_splits: Json;
          source: string;
          sport_type: string | null;
          start_lat: number | null;
          start_lng: number | null;
          start_time: string | null;
          strava_activity_id: number | null;
          summary_polyline: string | null;
          title: string | null;
          total_time: number;
          training_load: number | null;
          tsb_at_date: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          atl_at_date?: number | null;
          avg_hr?: number | null;
          avg_pace: number;
          avg_power?: number | null;
          created_at?: string;
          ctl_at_date?: number | null;
          date: string;
          distance: number;
          elevation_gain?: number;
          elevation_loss?: number;
          end_lat?: number | null;
          end_lng?: number | null;
          gpx_file_url?: string | null;
          id?: string;
          max_hr?: number | null;
          max_power?: number | null;
          moving_time: number;
          raw_source?: Json;
          raw_splits?: Json;
          source: string;
          sport_type?: string | null;
          start_lat?: number | null;
          start_lng?: number | null;
          start_time?: string | null;
          strava_activity_id?: number | null;
          summary_polyline?: string | null;
          title?: string | null;
          total_time: number;
          training_load?: number | null;
          tsb_at_date?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          atl_at_date?: number | null;
          avg_hr?: number | null;
          avg_pace?: number;
          avg_power?: number | null;
          created_at?: string;
          ctl_at_date?: number | null;
          date?: string;
          distance?: number;
          elevation_gain?: number;
          elevation_loss?: number;
          end_lat?: number | null;
          end_lng?: number | null;
          gpx_file_url?: string | null;
          id?: string;
          max_hr?: number | null;
          max_power?: number | null;
          moving_time?: number;
          raw_source?: Json;
          raw_splits?: Json;
          source?: string;
          sport_type?: string | null;
          start_lat?: number | null;
          start_lng?: number | null;
          start_time?: string | null;
          strava_activity_id?: number | null;
          summary_polyline?: string | null;
          title?: string | null;
          total_time?: number;
          training_load?: number | null;
          tsb_at_date?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      segment_efforts: {
        Row: {
          avg_hr: number | null;
          date: string;
          elapsed_time: number;
          id: string;
          run_id: string;
          segment_id: string;
          user_id: string;
        };
        Insert: {
          avg_hr?: number | null;
          date: string;
          elapsed_time: number;
          id?: string;
          run_id: string;
          segment_id: string;
          user_id: string;
        };
        Update: {
          avg_hr?: number | null;
          date?: string;
          elapsed_time?: number;
          id?: string;
          run_id?: string;
          segment_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "segment_efforts_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "segment_efforts_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "segments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "segment_efforts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      segments: {
        Row: {
          best_date: string | null;
          best_time: number | null;
          created_at: string;
          distance: number | null;
          end_lat: number | null;
          end_lng: number | null;
          id: string;
          kom_time: number | null;
          name: string;
          start_lat: number | null;
          start_lng: number | null;
          strava_segment_id: number | null;
          user_id: string;
        };
        Insert: {
          best_date?: string | null;
          best_time?: number | null;
          created_at?: string;
          distance?: number | null;
          end_lat?: number | null;
          end_lng?: number | null;
          id?: string;
          kom_time?: number | null;
          name: string;
          start_lat?: number | null;
          start_lng?: number | null;
          strava_segment_id?: number | null;
          user_id: string;
        };
        Update: {
          best_date?: string | null;
          best_time?: number | null;
          created_at?: string;
          distance?: number | null;
          end_lat?: number | null;
          end_lng?: number | null;
          id?: string;
          kom_time?: number | null;
          name?: string;
          start_lat?: number | null;
          start_lng?: number | null;
          strava_segment_id?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "segments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      strava_tokens: {
        Row: {
          access_token: string;
          created_at: string;
          expires_at: string;
          refresh_token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          expires_at: string;
          refresh_token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          expires_at?: string;
          refresh_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "strava_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_reports: {
        Row: {
          atl_end: number | null;
          avg_hr: number | null;
          avg_pace: number | null;
          ctl_end: number | null;
          generated_at: string;
          id: string;
          insight_text: string | null;
          num_runs: number | null;
          total_d_plus: number | null;
          total_km: number | null;
          total_time: number | null;
          tsb_end: number | null;
          user_id: string;
          vs_prev_d_plus_delta: number | null;
          vs_prev_km_delta: number | null;
          vs_prev_time_delta: number | null;
          week_start: string;
          zone_breakdown: Json | null;
        };
        Insert: {
          atl_end?: number | null;
          avg_hr?: number | null;
          avg_pace?: number | null;
          ctl_end?: number | null;
          generated_at?: string;
          id?: string;
          insight_text?: string | null;
          num_runs?: number | null;
          total_d_plus?: number | null;
          total_km?: number | null;
          total_time?: number | null;
          tsb_end?: number | null;
          user_id: string;
          vs_prev_d_plus_delta?: number | null;
          vs_prev_km_delta?: number | null;
          vs_prev_time_delta?: number | null;
          week_start: string;
          zone_breakdown?: Json | null;
        };
        Update: {
          atl_end?: number | null;
          avg_hr?: number | null;
          avg_pace?: number | null;
          ctl_end?: number | null;
          generated_at?: string;
          id?: string;
          insight_text?: string | null;
          num_runs?: number | null;
          total_d_plus?: number | null;
          total_km?: number | null;
          total_time?: number | null;
          tsb_end?: number | null;
          user_id?: string;
          vs_prev_d_plus_delta?: number | null;
          vs_prev_km_delta?: number | null;
          vs_prev_time_delta?: number | null;
          week_start?: string;
          zone_breakdown?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
