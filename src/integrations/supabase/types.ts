export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            ai_feedback_cache: {
                Row: {
                    action_plan: string | null
                    created_at: string
                    expires_at: string
                    feedback_text: string
                    feedback_type: string
                    id: string
                    learning_gaps: string | null
                    mistake_count: number
                    pattern_analysis: string | null
                    practice_focus: string | null
                    root_causes: string | null
                    scope_value: string | null
                    user_id: string
                }
                Insert: {
                    action_plan?: string | null
                    created_at?: string
                    expires_at: string
                    feedback_text: string
                    feedback_type: string
                    id?: string
                    learning_gaps?: string | null
                    mistake_count: number
                    pattern_analysis?: string | null
                    practice_focus?: string | null
                    root_causes?: string | null
                    scope_value?: string | null
                    user_id: string
                }
                Update: {
                    action_plan?: string | null
                    created_at?: string
                    expires_at?: string
                    feedback_text?: string
                    feedback_type?: string
                    id?: string
                    learning_gaps?: string | null
                    mistake_count?: number
                    pattern_analysis?: string | null
                    practice_focus?: string | null
                    root_causes?: string | null
                    scope_value?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            exam_attempts: {
                Row: {
                    answers: Json
                    completed_at: string | null
                    created_at: string
                    exam_id: string
                    id: string
                    is_submitted: boolean
                    score: number
                    total_questions: number
                    user_id: string
                }
                Insert: {
                    answers?: Json
                    completed_at?: string | null
                    created_at?: string
                    exam_id: string
                    id?: string
                    is_submitted?: boolean
                    score?: number
                    total_questions: number
                    user_id: string
                }
                Update: {
                    answers?: Json
                    completed_at?: string | null
                    created_at?: string
                    exam_id?: string
                    id?: string
                    is_submitted?: boolean
                    score?: number
                    total_questions?: number
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "exam_attempts_exam_id_fkey"
                        columns: ["exam_id"]
                        isOneToOne: false
                        referencedRelation: "exams"
                        referencedColumns: ["id"]
                    }
                ]
            }
            exams: {
                Row: {
                    allow_retake: boolean
                    created_at: string
                    created_by: string | null
                    description: string | null
                    duration_minutes: number
                    end_time: string | null
                    id: string
                    is_published: boolean
                    question_ids: string[] | null
                    show_leaderboard: boolean
                    show_results_immediately: boolean
                    show_topic_breakdown: boolean
                    start_time: string | null
                    title: string
                    type: string
                }
                Insert: {
                    allow_retake?: boolean
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    duration_minutes: number
                    end_time?: string | null
                    id?: string
                    is_published?: boolean
                    question_ids?: string[] | null
                    show_leaderboard?: boolean
                    show_results_immediately?: boolean
                    show_topic_breakdown?: boolean
                    start_time?: string | null
                    title: string
                    type: string
                }
                Update: {
                    allow_retake?: boolean
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    duration_minutes?: number
                    end_time?: string | null
                    id?: string
                    is_published?: boolean
                    question_ids?: string[] | null
                    show_leaderboard?: boolean
                    show_results_immediately?: boolean
                    show_topic_breakdown?: boolean
                    start_time?: string | null
                    title?: string
                    type?: string
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
                    context: string
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
                    context: string
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
                    context?: string
                    session_id?: string | null
                    time_taken_seconds?: number | null
                    topic?: string | null
                    subtopic?: string | null
                    difficulty?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "mistake_logs_question_id_fkey"
                        columns: ["question_id"]
                        isOneToOne: false
                        referencedRelation: "questions"
                        referencedColumns: ["id"]
                    }
                ]
            }
            mistake_stats: {
                Row: {
                    user_id: string | null
                    question_id: string | null
                    mistake_count: number | null
                    correct_after_last_mistake: number | null
                    last_mistake_at: string | null
                    severity_level: string | null
                    severity_score: number | null
                }
                Insert: {
                    user_id?: string | null
                    question_id?: string | null
                    mistake_count?: number | null
                    correct_after_last_mistake?: number | null
                    last_mistake_at?: string | null
                    severity_level?: string | null
                    severity_score?: number | null
                }
                Update: {
                    user_id?: string | null
                    question_id?: string | null
                    mistake_count?: number | null
                    correct_after_last_mistake?: number | null
                    last_mistake_at?: string | null
                    severity_level?: string | null
                    severity_score?: number | null
                }
                Relationships: []
            }
            practice_sessions: {
                Row: {
                    id: string
                    user_id: string
                    mode: string
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
                    mode: string
                    time_per_question?: number | null
                    subjects: string[]
                    total_questions: number
                    correct_count?: number
                    started_at?: string
                    completed_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    mode?: string
                    time_per_question?: number | null
                    subjects?: string[]
                    total_questions?: number
                    correct_count?: number
                    started_at?: string
                    completed_at?: string | null
                }
                Relationships: []
            }
            questions: {
                Row: {
                    id: string
                    question_text: string
                    options: Json
                    correct_answer: string | null
                    explanation: string | null
                    difficulty: string | null
                    topic: string | null
                    subtopic: string | null
                    image_url: string | null
                    passage_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    question_text: string
                    options: Json
                    correct_answer?: string | null
                    explanation?: string | null
                    difficulty?: string | null
                    topic?: string | null
                    subtopic?: string | null
                    image_url?: string | null
                    passage_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    question_text?: string
                    options?: Json
                    correct_answer?: string | null
                    explanation?: string | null
                    difficulty?: string | null
                    topic?: string | null
                    subtopic?: string | null
                    image_url?: string | null
                    passage_id?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "questions_passage_id_fkey"
                        columns: ["passage_id"]
                        isOneToOne: false
                        referencedRelation: "reading_passages"
                        referencedColumns: ["id"]
                    }
                ]
            }
            reading_passages: {
                Row: {
                    content: string
                    created_at: string
                    id: string
                    image_url: string | null
                    title: string | null
                }
                Insert: {
                    content: string
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    title?: string | null
                }
                Update: {
                    content?: string
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    title?: string | null
                }
                Relationships: []
            }
            study_materials: {
                Row: {
                    content: string | null
                    created_at: string
                    id: string
                    is_published: boolean
                    sort_order: number | null
                    study_topic_id: string
                    title: string
                    type: string | null
                    updated_at: string
                    url: string | null
                }
                Insert: {
                    content?: string | null
                    created_at?: string
                    id?: string
                    is_published?: boolean
                    sort_order?: number | null
                    study_topic_id: string
                    title: string
                    type?: string | null
                    updated_at?: string
                    url?: string | null
                }
                Update: {
                    content?: string | null
                    created_at?: string
                    id?: string
                    is_published?: boolean
                    sort_order?: number | null
                    study_topic_id?: string
                    title?: string
                    type?: string | null
                    updated_at?: string
                    url?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "study_materials_study_topic_id_fkey"
                        columns: ["study_topic_id"]
                        isOneToOne: false
                        referencedRelation: "study_topics"
                        referencedColumns: ["id"]
                    }
                ]
            }
            study_topics: {
                Row: {
                    color: string | null
                    created_at: string
                    description: string | null
                    icon_name: string | null
                    id: string
                    is_published: boolean
                    parent_id: string | null
                    slug: string
                    sort_order: number | null
                    subtopic_name: string | null
                    title: string
                    topic_name: string | null
                    updated_at: string
                }
                Insert: {
                    color?: string | null
                    created_at?: string
                    description?: string | null
                    icon_name?: string | null
                    id?: string
                    is_published?: boolean
                    parent_id?: string | null
                    slug: string
                    sort_order?: number | null
                    subtopic_name?: string | null
                    title: string
                    topic_name?: string | null
                    updated_at?: string
                }
                Update: {
                    color?: string | null
                    created_at?: string
                    description?: string | null
                    icon_name?: string | null
                    id?: string
                    is_published?: boolean
                    parent_id?: string | null
                    slug?: string
                    sort_order?: number | null
                    subtopic_name?: string | null
                    title?: string
                    topic_name?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "study_topics_parent_id_fkey"
                        columns: ["parent_id"]
                        isOneToOne: false
                        referencedRelation: "study_topics"
                        referencedColumns: ["id"]
                    }
                ]
            }
            study_user_progress: {
                Row: {
                    id: string
                    is_completed: boolean
                    last_accessed_at: string
                    materials_read: string[]
                    practice_attempted: number
                    practice_correct: number
                    study_topic_id: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    is_completed?: boolean
                    last_accessed_at?: string
                    materials_read?: string[]
                    practice_attempted?: number
                    practice_correct?: number
                    study_topic_id: string
                    user_id: string
                }
                Update: {
                    id?: string
                    is_completed?: boolean
                    last_accessed_at?: string
                    materials_read?: string[]
                    practice_attempted?: number
                    practice_correct?: number
                    study_topic_id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "study_user_progress_study_topic_id_fkey"
                        columns: ["study_topic_id"]
                        isOneToOne: false
                        referencedRelation: "study_topics"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            submit_exam_attempt: {
                Args: {
                    p_attempt_id: string
                    p_answers: Json
                }
                Returns: Json
            }
            get_high_priority_mistakes: {
                Args: {
                    p_user_id: string
                    p_limit: number
                    p_min_score: number
                }
                Returns: {
                    question_id: string
                    severity_level: string
                    severity_score: number
                    mistake_count: number
                    correct_after_last_mistake: number
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never