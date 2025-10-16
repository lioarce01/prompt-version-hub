export type Environment = "dev" | "staging" | "production";

export interface Deployment {
  id: number;
  prompt_id: number;
  prompt_name?: string;
  prompt_version?: number;
  environment: Environment;
  deployed_at: string;
  deployed_by: number;
}

export interface DeployRequest {
  prompt_name: string;
  version: number;
  environment: Environment;
}

export interface DeploymentFilters {
  environment?: Environment;
  prompt_name?: string;
  limit?: number;
  offset?: number;
}
