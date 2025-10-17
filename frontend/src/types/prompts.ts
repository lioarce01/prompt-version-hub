export interface Prompt {
  id: number;
  name: string;
  template: string;
  variables: string[];
  version: number;
  created_by: number;
  created_at: string;
  active: boolean;
}

export interface CreatePromptRequest {
  name: string;
  template: string;
  variables: string[];
}

export interface UpdatePromptRequest {
  template: string;
  variables: string[];
}

export interface PromptVersion {
  id: number;
  name: string;
  template: string;
  variables: string[];
  version: number;
  created_by: number;
  created_at: string;
  active: boolean;
}

export interface PromptListResponse {
  items: Prompt[];
  limit: number;
  offset: number;
  count: number;
  has_next: boolean;
}

export interface PromptDiffResponse {
  from_version: number;
  to_version: number;
  diff: string;
}

export interface DiffResponse {
  from_version: number;
  to_version: number;
  diff: string;
}

export interface PromptFilters {
  q?: string;
  active?: boolean;
  created_by?: number;
  latest_only?: boolean;
  sort_by?: "name" | "created_at";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
