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
      claims: {
        Row: {
          amount: number
          chain: Database["public"]["Enums"]["blockchain_chain"]
          code: string
          created_at: string
          id: string
          points_redeemed: number
          processed_at: string | null
          status: string | null
          streak_redeemed: boolean
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          chain: Database["public"]["Enums"]["blockchain_chain"]
          code: string
          created_at?: string
          id?: string
          points_redeemed?: number
          processed_at?: string | null
          status?: string | null
          streak_redeemed?: boolean
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          chain?: Database["public"]["Enums"]["blockchain_chain"]
          code?: string
          created_at?: string
          id?: string
          points_redeemed?: number
          processed_at?: string | null
          status?: string | null
          streak_redeemed?: boolean
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          abi: Json | null
          chain: string
          contract_address: string
          created_at: string | null
          id: string
          is_active: boolean | null
          program_id: string | null
          updated_at: string | null
          usdc_address: string
        }
        Insert: {
          abi?: Json | null
          chain: string
          contract_address: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
          updated_at?: string | null
          usdc_address: string
        }
        Update: {
          abi?: Json | null
          chain?: string
          contract_address?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          program_id?: string | null
          updated_at?: string | null
          usdc_address?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          earnings: number
          id: string
          outcome: string
          questions_attempted: number
          questions_correct: number
          timestamp: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          earnings?: number
          id?: string
          outcome: string
          questions_attempted: number
          questions_correct: number
          timestamp?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          earnings?: number
          id?: string
          outcome?: string
          questions_attempted?: number
          questions_correct?: number
          timestamp?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number
          chain: Database["public"]["Enums"]["blockchain_chain"]
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          quantity: number
          session_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          tokens_credited: number
          tx_hash: string
          updated_at: string
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          amount?: number
          chain: Database["public"]["Enums"]["blockchain_chain"]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          quantity?: number
          session_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          tokens_credited?: number
          tx_hash: string
          updated_at?: string
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number
          chain?: Database["public"]["Enums"]["blockchain_chain"]
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          quantity?: number
          session_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          tokens_credited?: number
          tx_hash?: string
          updated_at?: string
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at: string
          expiry_date: string
          id: string
          is_active: boolean
          options: Json
          source_url: string | null
          text: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at?: string
          expiry_date: string
          id?: string
          is_active?: boolean
          options: Json
          source_url?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer?: string
          created_at?: string
          expiry_date?: string
          id?: string
          is_active?: boolean
          options?: Json
          source_url?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          balance: number
          chain: Database["public"]["Enums"]["blockchain_chain"]
          contract_credits: number | null
          created_at: string
          credits: number
          id: string
          last_play: string | null
          last_win: string | null
          points: number
          streak: number
          tokens: number
          total_plays: number
          total_wins: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          balance?: number
          chain: Database["public"]["Enums"]["blockchain_chain"]
          contract_credits?: number | null
          created_at?: string
          credits?: number
          id?: string
          last_play?: string | null
          last_win?: string | null
          points?: number
          streak?: number
          tokens?: number
          total_plays?: number
          total_wins?: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          balance?: number
          chain?: Database["public"]["Enums"]["blockchain_chain"]
          contract_credits?: number | null
          created_at?: string
          credits?: number
          id?: string
          last_play?: string | null
          last_win?: string | null
          points?: number
          streak?: number
          tokens?: number
          total_plays?: number
          total_wins?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      questions_public: {
        Row: {
          category: Database["public"]["Enums"]["question_category"] | null
          created_at: string | null
          expiry_date: string | null
          id: string | null
          is_active: boolean | null
          options: Json | null
          source_url: string | null
          text: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["question_category"] | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string | null
          is_active?: boolean | null
          options?: Json | null
          source_url?: string | null
          text?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"] | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string | null
          is_active?: boolean | null
          options?: Json | null
          source_url?: string | null
          text?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ensure_test_credits: {
        Args: {
          _chain: Database["public"]["Enums"]["blockchain_chain"]
          _target?: number
          _threshold?: number
          _wallet_address: string
        }
        Returns: undefined
      }
      get_wallet_profile: {
        Args: { _wallet_address: string }
        Returns: {
          balance: number
          credits: number
          points: number
          streak: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_wallet_admin: {
        Args: { wallet_addr: string }
        Returns: boolean
      }
      set_wallet_session: {
        Args: { wallet_addr: string }
        Returns: undefined
      }
      simulate_credit_purchase: {
        Args: {
          _amount: number
          _chain: Database["public"]["Enums"]["blockchain_chain"]
          _quantity: number
          _tx_hash: string
          _wallet_address: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      blockchain_chain: "solana" | "base"
      purchase_status: "pending" | "confirmed" | "rejected"
      question_category: "CT" | "Web3" | "News" | "ct" | "web3" | "news"
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
      app_role: ["admin", "user"],
      blockchain_chain: ["solana", "base"],
      purchase_status: ["pending", "confirmed", "rejected"],
      question_category: ["CT", "Web3", "News", "ct", "web3", "news"],
    },
  },
} as const
