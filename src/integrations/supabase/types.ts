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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_progress: {
        Row: {
          created_at: string
          current_step: number | null
          game_type: string
          id: string
          pack_id: string
          state: Json | null
          total_steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number | null
          game_type: string
          id?: string
          pack_id: string
          state?: Json | null
          total_steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number | null
          game_type?: string
          id?: string
          pack_id?: string
          state?: Json | null
          total_steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          difficulty: string | null
          game_id: string
          id: string
          is_win: boolean | null
          mode: string | null
          price_paid: number | null
          score: number | null
          status: string | null
          topic: string | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          difficulty?: string | null
          game_id: string
          id?: string
          is_win?: boolean | null
          mode?: string | null
          price_paid?: number | null
          score?: number | null
          status?: string | null
          topic?: string | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          difficulty?: string | null
          game_id?: string
          id?: string
          is_win?: boolean | null
          mode?: string | null
          price_paid?: number | null
          score?: number | null
          status?: string | null
          topic?: string | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          author_id: string | null
          created_at: string
          description: string | null
          game_type: string | null
          id: string
          is_published: boolean | null
          price: number | null
          question_count: number | null
          questions: Json | null
          title: string
          topic: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          description?: string | null
          game_type?: string | null
          id?: string
          is_published?: boolean | null
          price?: number | null
          question_count?: number | null
          questions?: Json | null
          title: string
          topic?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          description?: string | null
          game_type?: string | null
          id?: string
          is_published?: boolean | null
          price?: number | null
          question_count?: number | null
          questions?: Json | null
          title?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      logs: {
        Row: {
          api_key: string | null
          bot_id: string | null
          bot_reply: string | null
          channel_id: string | null
          channel_name: string | null
          created_at: string | null
          function_call_params: string | null
          function_error: string | null
          id: number
          llm: string | null
          server_name: string | null
          tokens_in_source: number | null
          tokens_out_source: number | null
          tokens_total: number | null
          tokens_user: number | null
          user_message: string | null
          user_social_id: string | null
        }
        Insert: {
          api_key?: string | null
          bot_id?: string | null
          bot_reply?: string | null
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string | null
          function_call_params?: string | null
          function_error?: string | null
          id?: never
          llm?: string | null
          server_name?: string | null
          tokens_in_source?: number | null
          tokens_out_source?: number | null
          tokens_total?: number | null
          tokens_user?: number | null
          user_message?: string | null
          user_social_id?: string | null
        }
        Update: {
          api_key?: string | null
          bot_id?: string | null
          bot_reply?: string | null
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string | null
          function_call_params?: string | null
          function_error?: string | null
          id?: never
          llm?: string | null
          server_name?: string | null
          tokens_in_source?: number | null
          tokens_out_source?: number | null
          tokens_total?: number | null
          tokens_user?: number | null
          user_message?: string | null
          user_social_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          author_name: string | null
          comments_count: number | null
          content: string
          created_at: string
          id: string
          likes_count: number | null
          media_type: string | null
          media_urls: string[] | null
          platforms: string[] | null
          scheduled_at: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          platforms?: string[] | null
          scheduled_at?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          platforms?: string[] | null
          scheduled_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      offline_registrations: {
        Row: {
          city: string
          comment: string | null
          created_at: string
          date: string
          id: string
          participants_count: number
          status: string | null
          team_name: string
          user_id: string
        }
        Insert: {
          city: string
          comment?: string | null
          created_at?: string
          date: string
          id?: string
          participants_count: number
          status?: string | null
          team_name: string
          user_id: string
        }
        Update: {
          city?: string
          comment?: string | null
          created_at?: string
          date?: string
          id?: string
          participants_count?: number
          status?: string | null
          team_name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          author_earnings: number | null
          author_status: string | null
          avatar_url: string | null
          balance: number | null
          created_at: string
          display_name: string | null
          email: string | null
          level: number | null
          referral_code: string | null
          referral_count: number | null
          referral_earnings: number | null
          referred_by: string | null
          referred_code: string | null
          role: string | null
          telegram_id: string | null
          telegram_profile_url: string | null
          uid: string
          username: string | null
        }
        Insert: {
          author_earnings?: number | null
          author_status?: string | null
          avatar_url?: string | null
          balance?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          level?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referral_earnings?: number | null
          referred_by?: string | null
          referred_code?: string | null
          role?: string | null
          telegram_id?: string | null
          telegram_profile_url?: string | null
          uid: string
          username?: string | null
        }
        Update: {
          author_earnings?: number | null
          author_status?: string | null
          avatar_url?: string | null
          balance?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          level?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referral_earnings?: number | null
          referred_by?: string | null
          referred_code?: string | null
          role?: string | null
          telegram_id?: string | null
          telegram_profile_url?: string | null
          uid?: string
          username?: string | null
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string
          game_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          game_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          game_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          item_id: string
          price_paid: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          price_paid: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          price_paid?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          author_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          format: string | null
          game_ids: string[] | null
          id: string
          price: number | null
          title: string
        }
        Insert: {
          author_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          game_ids?: string[] | null
          id: string
          price?: number | null
          title: string
        }
        Update: {
          author_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          game_ids?: string[] | null
          id?: string
          price?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
