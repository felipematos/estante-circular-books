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
      conversations: {
        Row: {
          buyer_id: string
          buyer_name: string
          id: string
          last_message_at: string
          listing_id: string
          listing_title: string
          seller_id: string
          seller_name: string
        }
        Insert: {
          buyer_id: string
          buyer_name?: string
          id?: string
          last_message_at?: string
          listing_id: string
          listing_title: string
          seller_id: string
          seller_name?: string
        }
        Update: {
          buyer_id?: string
          buyer_name?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          listing_title?: string
          seller_id?: string
          seller_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          cover_path: string
          created_at: string
          expires_at: string
          id: string
          price_cents: number
          seller_id: string
          seller_name: string
          status: string
          title: string
          weight_g: number
        }
        Insert: {
          cover_path: string
          created_at?: string
          expires_at?: string
          id?: string
          price_cents: number
          seller_id: string
          seller_name?: string
          status?: string
          title: string
          weight_g: number
        }
        Update: {
          cover_path?: string
          created_at?: string
          expires_at?: string
          id?: string
          price_cents?: number
          seller_id?: string
          seller_name?: string
          status?: string
          title?: string
          weight_g?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_name: string
          buyer_phone: string
          cover_path: string
          created_at: string
          gateway_fee_cents: number | null
          id: string
          listing_id: string
          payout_at: string | null
          payout_status: string
          platform_fee_cents: number
          price_cents: number
          seller_id: string
          ship_cep: string
          ship_city: string
          ship_complement: string
          ship_district: string
          ship_number: string
          ship_state: string
          ship_street: string
          shipping_cents: number | null
          status: string
          title: string
          tracking_code: string
          updated_at: string
          weight_g: number
        }
        Insert: {
          buyer_id: string
          buyer_name: string
          buyer_phone?: string
          cover_path: string
          created_at?: string
          gateway_fee_cents?: number | null
          id?: string
          listing_id: string
          payout_at?: string | null
          payout_status?: string
          platform_fee_cents: number
          price_cents: number
          seller_id: string
          ship_cep: string
          ship_city: string
          ship_complement?: string
          ship_district?: string
          ship_number: string
          ship_state: string
          ship_street: string
          shipping_cents?: number | null
          status?: string
          title: string
          tracking_code?: string
          updated_at?: string
          weight_g: number
        }
        Update: {
          buyer_id?: string
          buyer_name?: string
          buyer_phone?: string
          cover_path?: string
          created_at?: string
          gateway_fee_cents?: number | null
          id?: string
          listing_id?: string
          payout_at?: string | null
          payout_status?: string
          platform_fee_cents?: number
          price_cents?: number
          seller_id?: string
          ship_cep?: string
          ship_city?: string
          ship_complement?: string
          ship_district?: string
          ship_number?: string
          ship_state?: string
          ship_street?: string
          shipping_cents?: number | null
          status?: string
          title?: string
          tracking_code?: string
          updated_at?: string
          weight_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          cep: string
          city: string
          complement: string
          created_at: string
          district: string
          document: string
          full_name: string
          id: string
          is_seller: boolean
          number: string
          phone: string
          pix_key: string
          state: string
          store_name: string
          street: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          cep?: string
          city?: string
          complement?: string
          created_at?: string
          district?: string
          document?: string
          full_name?: string
          id: string
          is_seller?: boolean
          number?: string
          phone?: string
          pix_key?: string
          state?: string
          store_name?: string
          street?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          cep?: string
          city?: string
          complement?: string
          created_at?: string
          district?: string
          document?: string
          full_name?: string
          id?: string
          is_seller?: boolean
          number?: string
          phone?: string
          pix_key?: string
          state?: string
          store_name?: string
          street?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_payout_info: {
        Args: { _seller_id: string }
        Returns: {
          document: string
          full_name: string
          pix_key: string
          store_name: string
        }[]
      }
      create_order: { Args: { _listing_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_payout: {
        Args: { _gateway_fee_cents: number; _order_id: string }
        Returns: undefined
      }
      renew_listing: { Args: { _id: string }; Returns: undefined }
      start_conversation: { Args: { _listing_id: string }; Returns: string }
      update_order_status: {
        Args: { _order_id: string; _status: string; _tracking?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
