export type Environment = "dev" | "staging" | "production";

export interface Deployment {
  id: number;
  prompt_id: number;
  prompt: {
    id: number;
    name: string;
    version: number;
    template: string;
    variables: string[];
    created_by: string;
    created_at: string;
    active: boolean;
    is_public: boolean;
    author?: {
      id: string;
      email: string;
      role: "admin" | "editor" | "viewer";
    };
  };
  environment: Environment;
  deployed_at: string;
  deployed_by: string;
  user?: {
    id: string;
    email: string;
    role: "admin" | "editor" | "viewer";
  };
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

export interface DeploymentHistoryResponse {
  items: Deployment[];
}
