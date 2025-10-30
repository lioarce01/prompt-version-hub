// KPI types matching backend schemas

export interface KpiSummary {
  totals: {
    prompts: number;
    active_prompts: number;
    deployments: number;
    experiments: number;
    usage_7d: number;
  };
}

export interface UsageTrendPoint {
  start: string; // ISO date string (YYYY-MM-DD)
  executions: number;
  failures: number;
  avg_latency: number | null;
  avg_cost: number | null;
}

export interface UsageTrend {
  bucket: "week" | "day";
  points: UsageTrendPoint[];
}

export interface VersionVelocityPoint {
  month: string; // YYYY-MM format
  releases: number;
}

export interface VersionVelocity {
  points: VersionVelocityPoint[];
}

export interface TopPromptItem {
  name: string;
  executions: number;
  success_rate: number; // 0.0 to 1.0
  avg_cost: number | null; // in cents
  last_updated: string; // ISO datetime string
}

export interface TopPrompts {
  items: TopPromptItem[];
}

export interface ExperimentArm {
  version: number;
  weight: number; // 0.0 to 1.0
  assignments: number;
  success_rate: number | null; // 0.0 to 1.0
}

export interface ExperimentItem {
  experiment: string;
  prompt: string;
  arms: ExperimentArm[];
}

export interface Experiments {
  items: ExperimentItem[];
}
