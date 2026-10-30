export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          id: string
          measured_on: string
          notes: string | null
          thigh_cm: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          id?: string
          measured_on: string
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          id?: string
          measured_on?: string
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          alternative_slugs: string[]
          category: string
          created_at: string
          description: string
          difficulty: number
          equipment: string[]
          hyrox_station: string | null
          id: string
          instructions: string[]
          is_archived: boolean
          library_version: number | null
          load_params: Json
          measurement: string
          movement_pattern: string
          name: string
          preference: string
          primary_muscles: string[]
          secondary_muscles: string[]
          slug: string
          source: string
          stress_regions: string[]
          training_types: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          alternative_slugs?: string[]
          category: string
          created_at?: string
          description?: string
          difficulty: number
          equipment?: string[]
          hyrox_station?: string | null
          id?: string
          instructions?: string[]
          is_archived?: boolean
          library_version?: number | null
          load_params: Json
          measurement: string
          movement_pattern: string
          name: string
          preference?: string
          primary_muscles: string[]
          secondary_muscles?: string[]
          slug: string
          source: string
          stress_regions?: string[]
          training_types: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          alternative_slugs?: string[]
          category?: string
          created_at?: string
          description?: string
          difficulty?: number
          equipment?: string[]
          hyrox_station?: string | null
          id?: string
          instructions?: string[]
          is_archived?: boolean
          library_version?: number | null
          load_params?: Json
          measurement?: string
          movement_pattern?: string
          name?: string
          preference?: string
          primary_muscles?: string[]
          secondary_muscles?: string[]
          slug?: string
          source?: string
          stress_regions?: string[]
          training_types?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          context: Json
          context_key: string
          created_at: string
          exercise_id: string
          id: string
          record_type: string
          session_id: string | null
          source: string
          unit: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          context?: Json
          context_key?: string
          created_at?: string
          exercise_id: string
          id?: string
          record_type: string
          session_id?: string | null
          source: string
          unit: string
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          achieved_at?: string
          context?: Json
          context_key?: string
          created_at?: string
          exercise_id?: string
          id?: string
          record_type?: string
          session_id?: string | null
          source?: string
          unit?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_session_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_workouts: {
        Row: {
          completed_session_id: string | null
          created_at: string
          explanation: string[]
          focus: string
          id: string
          intensity: string
          original_date: string | null
          scheduled_date: string
          source: string
          status: string
          target_duration_min: number
          updated_at: string
          user_id: string
          week_plan_id: string | null
          workout: Json | null
        }
        Insert: {
          completed_session_id?: string | null
          created_at?: string
          explanation?: string[]
          focus: string
          id?: string
          intensity: string
          original_date?: string | null
          scheduled_date: string
          source?: string
          status?: string
          target_duration_min: number
          updated_at?: string
          user_id?: string
          week_plan_id?: string | null
          workout?: Json | null
        }
        Update: {
          completed_session_id?: string | null
          created_at?: string
          explanation?: string[]
          focus?: string
          id?: string
          intensity?: string
          original_date?: string | null
          scheduled_date?: string
          source?: string
          status?: string
          target_duration_min?: number
          updated_at?: string
          user_id?: string
          week_plan_id?: string | null
          workout?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_workouts_completed_session_id_fkey"
            columns: ["completed_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_workouts_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_equipment: string[]
          birth_date: string | null
          created_at: string
          default_duration_min: number
          display_name: string | null
          endurance_experience: string | null
          fitness_notes: string | null
          height_cm: number | null
          hyrox_best_time_sec: number | null
          hyrox_experience: string | null
          limitation_notes: string | null
          limitation_regions: string[]
          onboarding_completed_at: string | null
          preferred_weekdays: number[]
          sex: string | null
          strength_experience: string | null
          training_days_per_week: number | null
          training_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_equipment?: string[]
          birth_date?: string | null
          created_at?: string
          default_duration_min?: number
          display_name?: string | null
          endurance_experience?: string | null
          fitness_notes?: string | null
          height_cm?: number | null
          hyrox_best_time_sec?: number | null
          hyrox_experience?: string | null
          limitation_notes?: string | null
          limitation_regions?: string[]
          onboarding_completed_at?: string | null
          preferred_weekdays?: number[]
          sex?: string | null
          strength_experience?: string | null
          training_days_per_week?: number | null
          training_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          available_equipment?: string[]
          birth_date?: string | null
          created_at?: string
          default_duration_min?: number
          display_name?: string | null
          endurance_experience?: string | null
          fitness_notes?: string | null
          height_cm?: number | null
          hyrox_best_time_sec?: number | null
          hyrox_experience?: string | null
          limitation_notes?: string | null
          limitation_regions?: string[]
          onboarding_completed_at?: string | null
          preferred_weekdays?: number[]
          sex?: string | null
          strength_experience?: string | null
          training_days_per_week?: number | null
          training_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_checkins: {
        Row: {
          checked_at: string
          created_at: string
          energy: number
          id: string
          recovery: number
          score: number
          sleep_quality: number
          soreness: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_at: string
          created_at?: string
          energy: number
          id: string
          recovery: number
          score: number
          sleep_quality: number
          soreness: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          energy?: number
          id?: string
          recovery?: number
          score?: number
          sleep_quality?: number
          soreness?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          block: string
          created_at: string
          exercise_id: string
          exercise_name: string
          id: string
          notes: string | null
          position: number
          replaced_exercise_id: string | null
          role: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block: string
          created_at?: string
          exercise_id: string
          exercise_name: string
          id: string
          notes?: string | null
          position: number
          replaced_exercise_id?: string | null
          role?: string | null
          session_id: string
          status: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          block?: string
          created_at?: string
          exercise_id?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          position?: number
          replaced_exercise_id?: string | null
          role?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_replaced_exercise_id_fkey"
            columns: ["replaced_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          calories: number | null
          completed: boolean
          completed_at: string | null
          created_at: string
          distance_m: number | null
          duration_sec: number | null
          id: string
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          set_number: number
          set_type: string
          target_calories: number | null
          target_distance_m: number | null
          target_duration_sec: number | null
          target_reps: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          id: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_number: number
          set_type: string
          target_calories?: number | null
          target_distance_m?: number | null
          target_duration_sec?: number | null
          target_reps?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_number?: number
          set_type?: string
          target_calories?: number | null
          target_distance_m?: number | null
          target_duration_sec?: number | null
          target_reps?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      training_goals: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          weight_endurance: number
          weight_hypertrophy: number
          weight_hyrox: number
          weight_strength: number
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id?: string
          weight_endurance?: number
          weight_hypertrophy?: number
          weight_hyrox?: number
          weight_strength?: number
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          weight_endurance?: number
          weight_hypertrophy?: number
          weight_hyrox?: number
          weight_strength?: number
        }
        Relationships: []
      }
      week_plans: {
        Row: {
          created_at: string
          generator_version: string | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          generator_version?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          week_start: string
        }
        Update: {
          created_at?: string
          generator_version?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          active_duration_sec: number
          created_at: string
          ended_at: string
          focus: string
          generator_version: string | null
          id: string
          intensity: string
          notes: string | null
          planned_workout_id: string | null
          readiness_checkin_id: string | null
          session_rpe: number | null
          started_at: string
          status: string
          training_load: number
          updated_at: string
          user_id: string
          workout_snapshot: Json
        }
        Insert: {
          active_duration_sec: number
          created_at?: string
          ended_at: string
          focus: string
          generator_version?: string | null
          id: string
          intensity: string
          notes?: string | null
          planned_workout_id?: string | null
          readiness_checkin_id?: string | null
          session_rpe?: number | null
          started_at: string
          status: string
          training_load?: number
          updated_at?: string
          user_id?: string
          workout_snapshot: Json
        }
        Update: {
          active_duration_sec?: number
          created_at?: string
          ended_at?: string
          focus?: string
          generator_version?: string | null
          id?: string
          intensity?: string
          notes?: string | null
          planned_workout_id?: string | null
          readiness_checkin_id?: string | null
          session_rpe?: number | null
          started_at?: string
          status?: string
          training_load?: number
          updated_at?: string
          user_id?: string
          workout_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_planned_workout_id_fkey"
            columns: ["planned_workout_id"]
            isOneToOne: false
            referencedRelation: "planned_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_readiness_checkin_id_fkey"
            columns: ["readiness_checkin_id"]
            isOneToOne: false
            referencedRelation: "readiness_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      replace_week_plan: { Args: { p: Json }; Returns: Json }
      save_profile: { Args: { p: Json }; Returns: Json }
      save_workout_session: { Args: { p: Json }; Returns: Json }
      sync_exercise_library: {
        Args: { p_exercises: Json; p_version: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
