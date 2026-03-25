export type Role = "gsm" | "property_manager" | "housekeeping" | "maintenance";

export type Database = {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      homeowners: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          dial_code: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          dial_code?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          dial_code?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      property_homeowners: {
        Row: {
          id: string;
          property_id: string;
          homeowner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          homeowner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          homeowner_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_homeowners_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_homeowners_homeowner_id_fkey";
            columns: ["homeowner_id"];
            isOneToOne: false;
            referencedRelation: "homeowners";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          property_section_id: string;
          created_at: string;
          is_active: boolean;
          house_phone: string | null;
          main_door_code: string | null;
          garage_code: string | null;
          wifi_password: string | null;
          property_manager_member_id: string | null;
          maintenance_member_id: string | null;
          housekeeping_member_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          property_section_id: string;
          created_at?: string;
          is_active?: boolean;
          house_phone?: string | null;
          main_door_code?: string | null;
          garage_code?: string | null;
          wifi_password?: string | null;
          property_manager_member_id?: string | null;
          maintenance_member_id?: string | null;
          housekeeping_member_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          property_section_id?: string;
          created_at?: string;
          is_active?: boolean;
          house_phone?: string | null;
          main_door_code?: string | null;
          garage_code?: string | null;
          wifi_password?: string | null;
          property_manager_member_id?: string | null;
          maintenance_member_id?: string | null;
          housekeeping_member_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "properties_property_section_id_fkey";
            columns: ["property_section_id"];
            isOneToOne: false;
            referencedRelation: "property_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      property_sections: {
        Row: {
          id: string;
          section_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      property_comments: {
        Row: {
          id: string;
          property_id: string;
          content: string;
          created_by_email: string;
          created_by_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          content: string;
          created_by_email: string;
          created_by_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          content?: string;
          created_by_email?: string;
          created_by_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_comments_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_assignments: {
        Row: {
          id: string;
          team_member_id: string;
          property_id: string;
          role: Role;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_member_id: string;
          property_id: string;
          role: Role;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_member_id?: string;
          property_id?: string;
          role?: Role;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_assignments_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_assignments_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
