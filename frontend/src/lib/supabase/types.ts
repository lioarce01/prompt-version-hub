/**
 * TypeScript types for Supabase Database
 *
 * These types are generated based on the database schema.
 * You can generate these automatically using: npx supabase gen types typescript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "editor" | "viewer";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: "admin" | "editor" | "viewer";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "admin" | "editor" | "viewer";
          created_at?: string;
        };
      };
      prompts: {
        Row: {
          id: number;
          name: string;
          template: string;
          variables: Json;
          version: number;
          created_by: string;
          created_at: string;
          active: boolean;
          is_public: boolean;
        };
        Insert: {
          id?: number;
          name: string;
          template: string;
          variables?: Json;
          version: number;
          created_by: string;
          created_at?: string;
          active?: boolean;
          is_public?: boolean;
        };
        Update: {
          id?: number;
          name?: string;
          template?: string;
          variables?: Json;
          version?: number;
          created_by?: string;
          created_at?: string;
          active?: boolean;
          is_public?: boolean;
        };
      };
      deployments: {
        Row: {
          id: number;
          prompt_id: number;
          environment: string;
          deployed_at: string;
          deployed_by: string;
        };
        Insert: {
          id?: number;
          prompt_id: number;
          environment: string;
          deployed_at?: string;
          deployed_by: string;
        };
        Update: {
          id?: number;
          prompt_id?: number;
          environment?: string;
          deployed_at?: string;
          deployed_by?: string;
        };
      };
      ab_policies: {
        Row: {
          id: number;
          prompt_name: string;
          weights: Json;
          created_by: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          prompt_name: string;
          weights?: Json;
          created_by?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          prompt_name?: string;
          weights?: Json;
          created_by?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ab_assignments: {
        Row: {
          id: number;
          experiment_name: string;
          prompt_name: string;
          user_id: string;
          version: number;
          assigned_at: string;
        };
        Insert: {
          id?: number;
          experiment_name: string;
          prompt_name: string;
          user_id: string;
          version: number;
          assigned_at?: string;
        };
        Update: {
          id?: number;
          experiment_name?: string;
          prompt_name?: string;
          user_id?: string;
          version?: number;
          assigned_at?: string;
        };
      };
      usage_events: {
        Row: {
          id: number;
          prompt_id: number;
          user_id: string | null;
          output: string | null;
          success: boolean;
          latency_ms: number | null;
          cost: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          prompt_id: number;
          user_id?: string | null;
          output?: string | null;
          success?: boolean;
          latency_ms?: number | null;
          cost?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          prompt_id?: number;
          user_id?: string | null;
          output?: string | null;
          success?: boolean;
          latency_ms?: number | null;
          cost?: number | null;
          created_at?: string;
        };
      };
      test_cases: {
        Row: {
          id: number;
          prompt_id: number;
          name: string;
          input_text: string;
          expected_output: string | null;
          category: "happy_path" | "edge_case" | "boundary" | "negative";
          auto_generated: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: number;
          prompt_id: number;
          name: string;
          input_text: string;
          expected_output?: string | null;
          category?: "happy_path" | "edge_case" | "boundary" | "negative";
          auto_generated?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: number;
          prompt_id?: number;
          name?: string;
          input_text?: string;
          expected_output?: string | null;
          category?: "happy_path" | "edge_case" | "boundary" | "negative";
          auto_generated?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
      };
      test_runs: {
        Row: {
          id: number;
          prompt_id: number;
          prompt_version: number;
          test_case_id: number | null;
          input_text: string;
          output_text: string | null;
          success: boolean | null;
          latency_ms: number | null;
          tokens_used: number | null;
          cost_cents: number | null;
          error_message: string | null;
          executed_at: string;
          executed_by: string | null;
        };
        Insert: {
          id?: number;
          prompt_id: number;
          prompt_version: number;
          test_case_id?: number | null;
          input_text: string;
          output_text?: string | null;
          success?: boolean | null;
          latency_ms?: number | null;
          tokens_used?: number | null;
          cost_cents?: number | null;
          error_message?: string | null;
          executed_at?: string;
          executed_by?: string | null;
        };
        Update: {
          id?: number;
          prompt_id?: number;
          prompt_version?: number;
          test_case_id?: number | null;
          input_text?: string;
          output_text?: string | null;
          success?: boolean | null;
          latency_ms?: number | null;
          tokens_used?: number | null;
          cost_cents?: number | null;
          error_message?: string | null;
          executed_at?: string;
          executed_by?: string | null;
        };
      };
      ai_generations: {
        Row: {
          id: number;
          user_id: string;
          request_data: Json;
          response_data: Json;
          prompt_template: string;
          variables: Json | null;
          created_at: string;
          ai_provider: string | null;
          ai_model: string | null;
          tokens_used: number | null;
          cost_cents: number | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          request_data: Json;
          response_data: Json;
          prompt_template: string;
          variables?: Json | null;
          created_at?: string;
          ai_provider?: string | null;
          ai_model?: string | null;
          tokens_used?: number | null;
          cost_cents?: number | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          request_data?: Json;
          response_data?: Json;
          prompt_template?: string;
          variables?: Json | null;
          created_at?: string;
          ai_provider?: string | null;
          ai_model?: string | null;
          tokens_used?: number | null;
          cost_cents?: number | null;
        };
      };
      refresh_tokens: {
        Row: {
          id: number;
          user_id: string;
          token: string;
          expires_at: string;
          created_at: string;
          revoked: boolean;
        };
        Insert: {
          id?: number;
          user_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
          revoked?: boolean;
        };
        Update: {
          id?: number;
          user_id?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
          revoked?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "editor" | "viewer";
      test_category: "happy_path" | "edge_case" | "boundary" | "negative";
    };
  };
};
