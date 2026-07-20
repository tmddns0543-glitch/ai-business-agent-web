export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      businesses: {
        Row: { id: string; name: string; owner_user_id: string; business_registration_number: string | null; owner_name: string | null; industry: string | null; region: string | null; status: "active" | "archived"; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; owner_user_id: string; business_registration_number?: string | null; owner_name?: string | null; industry?: string | null; region?: string | null; status?: "active" | "archived"; created_at?: string; updated_at?: string };
        Update: { name?: string; business_registration_number?: string | null; owner_name?: string | null; industry?: string | null; region?: string | null; status?: "active" | "archived"; updated_at?: string };
        Relationships: [];
      };
      business_memberships: {
        Row: { id: string; business_id: string; user_id: string; role: "owner" | "manager" | "staff"; status: "active" | "inactive"; created_at: string };
        Insert: { id?: string; business_id: string; user_id: string; role: "owner" | "manager" | "staff"; status?: "active" | "inactive"; created_at?: string };
        Update: { role?: "owner" | "manager" | "staff"; status?: "active" | "inactive" };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          business_date: string;
          platform: string;
          channel: string;
          payment_method: string | null;
          amount: number;
          order_count: number | null;
          memo: string | null;
          source: string;
          source_record_id: string | null;
          import_key: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          business_date: string;
          platform: string;
          channel: string;
          payment_method?: string | null;
          amount: number;
          order_count?: number | null;
          memo?: string | null;
          source?: string;
          source_record_id?: string | null;
          import_key?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_date?: string;
          platform?: string;
          channel?: string;
          payment_method?: string | null;
          amount?: number;
          order_count?: number | null;
          memo?: string | null;
          source?: string;
          source_record_id?: string | null;
          import_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      has_current_business: { Args: Record<PropertyKey, never>; Returns: boolean };
      create_initial_business: {
        Args: { business_name: string; business_industry: string; registration_number?: string | null; representative_name?: string | null; business_region?: string | null };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type MembershipRole = Database["public"]["Tables"]["business_memberships"]["Row"]["role"];
