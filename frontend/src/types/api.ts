// Base API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  has_next: boolean;
}

export interface ApiError {
  detail: string;
}

// User types
export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Experiments (A/B Testing) types
export interface ABPolicy {
  id: number;
  prompt_name: string;
  weights: Record<string, number>; // version: weight (e.g., {"1": 50, "2": 50})
  created_by: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ABPolicyListItem {
  id: number;
  prompt_name: string;
  weights: Record<string, number>;
  is_public: boolean;
  created_at: string;
  is_owner: boolean; // Computed: true if current user owns it
}

export interface ABPolicyInput {
  prompt_name: string;
  weights: Record<string, number>;
  is_public?: boolean;
}

export interface ABAssignment {
  experiment_name: string;
  prompt_name: string;
  user_id: string;
  version: number;
}

export interface ABAssignmentInput {
  experiment_name: string;
  prompt_name: string;
  user_id: string;
}

export interface ABStats {
  experiment_name: string;
  total_assignments: number;
  variants: Record<string, {
    count: number;
    percentage: number;
  }>;
}
