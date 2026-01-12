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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      questions: {
        Row: {
          id: string
          created_at: string
          question_text: string
          options: string[] | null
          correct_answer: string | null
          explanation: string | null
          subject: string | null
          unit_id: string | null
          difficulty: string | null
          subtopic: string | null
          topic: string | null
          image_url: string | null
          is_verified: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          question_text: string
          options?: string[] | null
          correct_answer?: string | null
          explanation?: string | null
          subject?: string | null
          unit_id?: string | null
          difficulty?: string | null
          subtopic?: string | null
          topic?: string | null
          image_url?: string | null
          is_verified?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          question_text?: string
          options?: string[] | null
          correct_answer?: string | null
          explanation?: string | null
          subject?: string | null
          unit_id?: string | null
          difficulty?: string | null
          subtopic?: string | null
          topic?: string | null
          image_url?: string | null
          is_verified?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          role: "user" | "operator"
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          id: string
          user_id: string
          mode: 'timed' | 'untimed'
          time_per_question: number | null
          subjects: string[]
          total_questions: number
          correct_count: number
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          mode: 'timed' | 'untimed'
          time_per_question?: number | null
          subjects?: string[]
          total_questions?: number
          correct_count?: number
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          mode?: 'timed' | 'untimed'
          time_per_question?: number | null
          subjects?: string[]
          total_questions?: number
          correct_count?: number
          started_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      practice_answers: {
        Row: {
          id: string
          session_id: string
          question_id: string
          user_answer: string | null
          is_correct: boolean
          time_taken_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          user_answer?: string | null
          is_correct?: boolean
          time_taken_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_id?: string
          user_answer?: string | null
          is_correct?: boolean
          time_taken_seconds?: number | null
          created_at?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          id: string
          title: string
          description: string | null
          type: 'mock' | 'live'
          question_ids: string[]
          duration_minutes: number
          start_time: string | null
          end_time: string | null
          allow_retake: boolean
          show_results_immediately: boolean
          show_leaderboard: boolean
          show_topic_breakdown: boolean
          is_published: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: 'mock' | 'live'
          question_ids?: string[]
          duration_minutes?: number
          start_time?: string | null
          end_time?: string | null
          allow_retake?: boolean
          show_results_immediately?: boolean
          show_leaderboard?: boolean
          show_topic_breakdown?: boolean
          is_published?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: 'mock' | 'live'
          question_ids?: string[]
          duration_minutes?: number
          start_time?: string | null
          end_time?: string | null
          allow_retake?: boolean
          show_results_immediately?: boolean
          show_leaderboard?: boolean
          show_topic_breakdown?: boolean
          is_published?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          answers: Record<string, string>
          score: number
          total_questions: number
          started_at: string
          submitted_at: string | null
          is_submitted: boolean
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          answers?: Record<string, string>
          score?: number
          total_questions?: number
          started_at?: string
          submitted_at?: string | null
          is_submitted?: boolean
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          answers?: Record<string, string>
          score?: number
          total_questions?: number
          started_at?: string
          submitted_at?: string | null
          is_submitted?: boolean
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          question_id: string
          is_correct: boolean
          answered_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          is_correct?: boolean
          answered_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          is_correct?: boolean
          answered_at?: string
        }
        Relationships: []
      }
      mistake_logs: {
        Row: {
          id: string
          user_id: string
          question_id: string
          user_answer: string | null
          correct_answer: string
          context: 'practice' | 'exam'
          session_id: string | null
          time_taken_seconds: number | null
          topic: string | null
          subtopic: string | null
          difficulty: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          user_answer?: string | null
          correct_answer: string
          context: 'practice' | 'exam'
          session_id?: string | null
          time_taken_seconds?: number | null
          topic?: string | null
          subtopic?: string | null
          difficulty?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          user_answer?: string | null
          correct_answer?: string
          context?: 'practice' | 'exam'
          session_id?: string | null
          time_taken_seconds?: number | null
          topic?: string | null
          subtopic?: string | null
          difficulty?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ai_feedback_cache: {
        Row: {
          id: string
          user_id: string
          feedback_type: 'overall' | 'category' | 'subject'
          scope_value: string | null
          feedback_text: string
          pattern_analysis: string | null
          root_causes: string | null
          learning_gaps: string | null
          action_plan: string | null
          practice_focus: string | null
          mistake_count: number
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feedback_type: 'overall' | 'category' | 'subject'
          scope_value?: string | null
          feedback_text: string
          pattern_analysis?: string | null
          root_causes?: string | null
          learning_gaps?: string | null
          action_plan?: string | null
          practice_focus?: string | null
          mistake_count?: number
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feedback_type?: 'overall' | 'category' | 'subject'
          scope_value?: string | null
          feedback_text?: string
          pattern_analysis?: string | null
          root_causes?: string | null
          learning_gaps?: string | null
          action_plan?: string | null
          practice_focus?: string | null
          mistake_count?: number
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_mistake_severity: {
        Args: {
          p_user_id: string
          p_question_id: string
        }
        Returns: {
          severity_level: string
          severity_score: number
          attempt_count: number
          last_attempt: string
        }[]
      }
      get_high_priority_mistakes: {
        Args: {
          p_user_id: string
          p_limit: number
        }
        Returns: {
          question_id: string
          severity_level: string
          severity_score: number
          mistake_count: number
          last_mistake_at: string
        }[]
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
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
