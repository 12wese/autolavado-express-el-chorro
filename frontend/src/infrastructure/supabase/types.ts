export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      addons: {
        Row: {
          business_id: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          name: string;
          price: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          name: string;
          price?: number;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          name?: string;
          price?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addons_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_memberships: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          invited_by_user_id: string | null;
          invited_email: string | null;
          role: string;
          status: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          invited_by_user_id?: string | null;
          invited_email?: string | null;
          role: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          invited_by_user_id?: string | null;
          invited_email?: string | null;
          role?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_memberships_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          created_at: string;
          created_by_user_id: string;
          id: string;
          legacy_owner_user_id: string | null;
          name: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          legacy_owner_user_id?: string | null;
          name: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          legacy_owner_user_id?: string | null;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_prices: {
        Row: {
          business_id: string;
          car_type: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          price: number;
          updated_at: string;
          user_id: string;
          wash_type: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          car_type: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          price?: number;
          updated_at?: string;
          user_id: string;
          wash_type: string;
        };
        Update: {
          business_id?: string;
          car_type?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          price?: number;
          updated_at?: string;
          user_id?: string;
          wash_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_prices_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      wash_job_addons: {
        Row: {
          addon_id: string | null;
          addon_name_snapshot: string;
          id: string;
          price_snapshot: number;
          wash_job_id: string;
        };
        ComputedFields: never;
        Insert: {
          addon_id?: string | null;
          addon_name_snapshot: string;
          id?: string;
          price_snapshot: number;
          wash_job_id: string;
        };
        Update: {
          addon_id?: string | null;
          addon_name_snapshot?: string;
          id?: string;
          price_snapshot?: number;
          wash_job_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wash_job_addons_addon_id_fkey";
            columns: ["addon_id"];
            isOneToOne: false;
            referencedRelation: "addons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wash_job_addons_wash_job_id_fkey";
            columns: ["wash_job_id"];
            isOneToOne: false;
            referencedRelation: "wash_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      wash_job_status_history: {
        Row: {
          actor_user_id: string | null;
          changed_at: string;
          id: string;
          new_status: Database["public"]["Enums"]["wash_status"];
          old_status: Database["public"]["Enums"]["wash_status"] | null;
          user_id: string;
          wash_job_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          changed_at?: string;
          id?: string;
          new_status: Database["public"]["Enums"]["wash_status"];
          old_status?: Database["public"]["Enums"]["wash_status"] | null;
          user_id: string;
          wash_job_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          changed_at?: string;
          id?: string;
          new_status?: Database["public"]["Enums"]["wash_status"];
          old_status?: Database["public"]["Enums"]["wash_status"] | null;
          user_id?: string;
          wash_job_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wash_job_status_history_wash_job_id_fkey";
            columns: ["wash_job_id"];
            isOneToOne: false;
            referencedRelation: "wash_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      wash_jobs: {
        Row: {
          business_id: string;
          car_type: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          license_plate: string;
          price: number;
          status: Database["public"]["Enums"]["wash_status"];
          updated_at: string;
          user_id: string;
          wash_type: string;
          washer_id: string | null;
          washer_name: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          car_type: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          license_plate?: string;
          price?: number;
          status?: Database["public"]["Enums"]["wash_status"];
          updated_at?: string;
          user_id: string;
          wash_type: string;
          washer_id?: string | null;
          washer_name: string;
        };
        Update: {
          business_id?: string;
          car_type?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          license_plate?: string;
          price?: number;
          status?: Database["public"]["Enums"]["wash_status"];
          updated_at?: string;
          user_id?: string;
          wash_type?: string;
          washer_id?: string | null;
          washer_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wash_jobs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wash_jobs_washer_business_fkey";
            columns: ["washer_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "washers";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      washers: {
        Row: {
          active: boolean;
          business_id: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          membership_id: string | null;
          name: string;
          qr_token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          business_id: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          membership_id?: string | null;
          name: string;
          qr_token?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          membership_id?: string | null;
          name?: string;
          qr_token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "washers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "washers_membership_business_fkey";
            columns: ["membership_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "business_memberships";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_pending_business_memberships: { Args: Record<PropertyKey, never>; Returns: number };
      advance_wash_job_status: {
        Args: {
          p_business_id: string;
          p_new_status: Database["public"]["Enums"]["wash_status"];
          p_wash_job_id: string;
        };
        Returns: undefined;
      };
      create_business_for_current_user: { Args: { p_name: string }; Returns: string };
      create_wash_job_with_addons: {
        Args: {
          p_addon_ids?: string[];
          p_base_price: number;
          p_business_id: string;
          p_car_type: string;
          p_license_plate: string;
          p_wash_type: string;
          p_washer_id: string;
        };
        Returns: string;
      };
      find_recent_wash_jobs_by_plate: {
        Args: { p_business_id: string; p_plate: string };
        Returns: {
          car_type: string;
          created_at: string;
          id: string;
          license_plate: string;
          price: number;
          status: Database["public"]["Enums"]["wash_status"];
          wash_type: string;
        }[];
      };
      invite_business_washer: {
        Args: { p_business_id: string; p_email: string; p_name: string };
        Returns: string;
      };
      is_active_business_member: { Args: { p_business_id: string }; Returns: boolean };
      is_assigned_washer: {
        Args: { p_business_id: string; p_washer_id: string };
        Returns: boolean;
      };
      is_business_admin: { Args: { p_business_id: string }; Returns: boolean };
    };
    Enums: {
      wash_status: "pending" | "in_progress" | "completed" | "delivered";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      wash_status: ["pending", "in_progress", "completed", "delivered"],
    },
  },
} as const;
