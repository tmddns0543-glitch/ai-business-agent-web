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
        Row: { id: string; name: string; owner_user_id: string; status: "active" | "archived"; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; owner_user_id: string; status?: "active" | "archived"; created_at?: string; updated_at?: string };
        Update: { name?: string; status?: "active" | "archived"; updated_at?: string };
        Relationships: [];
      };
      business_memberships: {
        Row: { id: string; business_id: string; user_id: string; role: "owner" | "manager" | "staff"; created_at: string };
        Insert: { id?: string; business_id: string; user_id: string; role: "owner" | "manager" | "staff"; created_at?: string };
        Update: { role?: "owner" | "manager" | "staff" };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      ensure_current_user_business: { Args: Record<PropertyKey, never>; Returns: string };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type MembershipRole = Database["public"]["Tables"]["business_memberships"]["Row"]["role"];
