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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          household_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          household_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          household_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      envelope_allocations: {
        Row: {
          allocated: number
          created_at: string
          envelope_id: string
          household_id: string | null
          id: string
          month_key: string
          spent: number
          user_id: string
        }
        Insert: {
          allocated?: number
          created_at?: string
          envelope_id: string
          household_id?: string | null
          id?: string
          month_key: string
          spent?: number
          user_id: string
        }
        Update: {
          allocated?: number
          created_at?: string
          envelope_id?: string
          household_id?: string | null
          id?: string
          month_key?: string
          spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "envelope_allocations_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envelope_allocations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      envelopes: {
        Row: {
          category: Database["public"]["Enums"]["envelope_category"]
          color: string
          created_at: string
          household_id: string | null
          icon: string
          id: string
          max_rollover_amount: number | null
          name: string
          position: number
          rollover: boolean
          rollover_percentage: number | null
          rollover_strategy: Database["public"]["Enums"]["rollover_strategy"]
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["envelope_category"]
          color?: string
          created_at?: string
          household_id?: string | null
          icon?: string
          id?: string
          max_rollover_amount?: number | null
          name: string
          position?: number
          rollover?: boolean
          rollover_percentage?: number | null
          rollover_strategy?: Database["public"]["Enums"]["rollover_strategy"]
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["envelope_category"]
          color?: string
          created_at?: string
          household_id?: string | null
          icon?: string
          id?: string
          max_rollover_amount?: number | null
          name?: string
          position?: number
          rollover?: boolean
          rollover_percentage?: number | null
          rollover_strategy?: Database["public"]["Enums"]["rollover_strategy"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "envelopes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string
          household_id: string | null
          id: string
          month_key: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description: string
          household_id?: string | null
          id?: string
          month_key: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string
          household_id?: string | null
          id?: string
          month_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          month_key: string
          to_be_budgeted: number
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          month_key: string
          to_be_budgeted?: number
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          month_key?: string
          to_be_budgeted?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          name: string
          quantity: number | null
          receipt_id: string
          total_price: number
          unit_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          name: string
          quantity?: number | null
          receipt_id: string
          total_price: number
          unit_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          name?: string
          quantity?: number | null
          receipt_id?: string
          total_price?: number
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          file_name: string | null
          household_id: string | null
          id: string
          path: string
          transaction_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          household_id?: string | null
          id?: string
          path: string
          transaction_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          household_id?: string | null
          id?: string
          path?: string
          transaction_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          envelope_id: string
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string | null
          id: string
          is_active: boolean
          merchant: string | null
          next_due_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          envelope_id: string
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          household_id?: string | null
          id?: string
          is_active?: boolean
          merchant?: string | null
          next_due_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          envelope_id?: string
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          household_id?: string | null
          id?: string
          is_active?: boolean
          merchant?: string | null
          next_due_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      rollover_history: {
        Row: {
          amount: number
          created_at: string | null
          envelope_id: string
          envelope_name: string
          household_id: string | null
          id: string
          source_month_key: string
          strategy: string
          target_month_key: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          envelope_id: string
          envelope_name: string
          household_id?: string | null
          id?: string
          source_month_key: string
          strategy: string
          target_month_key: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          envelope_id?: string
          envelope_name?: string
          household_id?: string | null
          id?: string
          source_month_key?: string
          strategy?: string
          target_month_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollover_history_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollover_history_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          auto_contribute: boolean
          celebration_threshold: number[] | null
          contribution_percentage: number | null
          created_at: string
          envelope_id: string
          household_id: string | null
          id: string
          is_paused: boolean
          monthly_contribution: number | null
          name: string | null
          priority: Database["public"]["Enums"]["savings_priority"]
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_contribute?: boolean
          celebration_threshold?: number[] | null
          contribution_percentage?: number | null
          created_at?: string
          envelope_id: string
          household_id?: string | null
          id?: string
          is_paused?: boolean
          monthly_contribution?: number | null
          name?: string | null
          priority?: Database["public"]["Enums"]["savings_priority"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_contribute?: boolean
          celebration_threshold?: number[] | null
          contribution_percentage?: number | null
          created_at?: string
          envelope_id?: string
          household_id?: string | null
          id?: string
          is_paused?: boolean
          monthly_contribution?: number | null
          name?: string | null
          priority?: Database["public"]["Enums"]["savings_priority"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: true
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          created_at: string
          envelope_id: string | null
          estimated_price: number | null
          household_id: string | null
          id: string
          is_checked: boolean
          name: string
          quantity: number | null
          suggested_from_history: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          envelope_id?: string | null
          estimated_price?: number | null
          household_id?: string | null
          id?: string
          is_checked?: boolean
          name: string
          quantity?: number | null
          suggested_from_history?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          envelope_id?: string | null
          estimated_price?: number | null
          household_id?: string | null
          id?: string
          is_checked?: boolean
          name?: string
          quantity?: number | null
          suggested_from_history?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_archives: {
        Row: {
          archived_at: string
          household_id: string | null
          id: string
          items: Json
          items_count: number
          name: string
          total_estimated: number | null
          user_id: string
        }
        Insert: {
          archived_at?: string
          household_id?: string | null
          id?: string
          items?: Json
          items_count?: number
          name?: string
          total_estimated?: number | null
          user_id: string
        }
        Update: {
          archived_at?: string
          household_id?: string | null
          id?: string
          items?: Json
          items_count?: number
          name?: string
          total_estimated?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_archives_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          created_at: string
          envelope_id: string
          household_id: string | null
          id: string
          parent_transaction_id: string
          percentage: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          envelope_id: string
          household_id?: string | null
          id?: string
          parent_transaction_id: string
          percentage?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          envelope_id?: string
          household_id?: string | null
          id?: string
          parent_transaction_id?: string
          percentage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string
          envelope_id: string
          household_id: string | null
          id: string
          is_split: boolean
          merchant: string | null
          notes: string | null
          receipt_path: string | null
          receipt_url: string | null
          recurring_transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description: string
          envelope_id: string
          household_id?: string | null
          id?: string
          is_split?: boolean
          merchant?: string | null
          notes?: string | null
          receipt_path?: string | null
          receipt_url?: string | null
          recurring_transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string
          envelope_id?: string
          household_id?: string | null
          id?: string
          is_split?: boolean
          merchant?: string | null
          notes?: string | null
          receipt_path?: string | null
          receipt_url?: string | null
          recurring_transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_allocation_atomic: {
        Args: { p_amount: number; p_envelope_id: string; p_month_key: string }
        Returns: undefined
      }
      adjust_to_be_budgeted: {
        Args: {
          p_amount: number
          p_household_id: string
          p_month_key: string
          p_user_id: string
        }
        Returns: undefined
      }
      decrement_spent_atomic: {
        Args: { p_amount: number; p_envelope_id: string; p_month_key: string }
        Returns: undefined
      }
      get_user_household_id: { Args: { _user_id: string }; Returns: string }
      increment_spent_atomic: {
        Args: { p_amount: number; p_envelope_id: string; p_month_key: string }
        Returns: undefined
      }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_action:
        | "income_added"
        | "income_updated"
        | "income_deleted"
        | "expense_added"
        | "expense_updated"
        | "expense_deleted"
        | "envelope_created"
        | "envelope_updated"
        | "envelope_deleted"
        | "allocation_made"
        | "transfer_made"
        | "recurring_created"
        | "recurring_updated"
        | "recurring_deleted"
        | "member_joined"
        | "member_left"
      envelope_category: "essentiels" | "lifestyle" | "epargne"
      recurring_frequency:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "yearly"
      rollover_strategy: "full" | "percentage" | "capped" | "none"
      savings_priority: "essential" | "high" | "medium" | "low"
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
    Enums: {
      activity_action: [
        "income_added",
        "income_updated",
        "income_deleted",
        "expense_added",
        "expense_updated",
        "expense_deleted",
        "envelope_created",
        "envelope_updated",
        "envelope_deleted",
        "allocation_made",
        "transfer_made",
        "recurring_created",
        "recurring_updated",
        "recurring_deleted",
        "member_joined",
        "member_left",
      ],
      envelope_category: ["essentiels", "lifestyle", "epargne"],
      recurring_frequency: [
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ],
      rollover_strategy: ["full", "percentage", "capped", "none"],
      savings_priority: ["essential", "high", "medium", "low"],
    },
  },
} as const
