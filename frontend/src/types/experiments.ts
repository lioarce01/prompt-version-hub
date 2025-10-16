export interface ABPolicy {
  id: number;
  prompt_name: string;
  weights: Record<string, number>; // { "1": 50, "2": 50 }
  updated_at: string;
}

export interface CreateABPolicyRequest {
  prompt_name: string;
  weights: Record<string, number>;
}

export interface ABAssignment {
  experiment_name: string;
  prompt_name: string;
  user_id: string;
  version: number;
}

export interface AssignVariantRequest {
  experiment_name: string;
  prompt_name: string;
  user_id: string;
}

export interface ExperimentStats {
  experiment_name: string;
  prompt_name: string;
  total_assignments: number;
  assignments_by_version: Record<string, number>;
  success_rate_by_version?: Record<string, number>;
  avg_latency_by_version?: Record<string, number>;
}
