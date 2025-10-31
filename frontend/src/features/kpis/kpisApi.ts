import { api } from "@/lib/api";
import type {
  KpiSummary,
  UsageTrend,
  VersionVelocity,
  TopPrompts,
  Experiments,
} from "@/types/kpis";

export const kpisApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    // GET /kpis/summary - Dashboard summary metrics
    getSummary: builder.query<KpiSummary, void>({
      query: () => "/kpis/summary",
      providesTags: ["Analytics"],
    }),

    // GET /kpis/usage-trend - Time series of usage metrics
    getUsageTrend: builder.query<
      UsageTrend,
      { period_days?: number; bucket?: "week" | "day" }
    >({
      query: (params) => ({
        url: "/kpis/usage-trend",
        params: {
          period_days: params.period_days ?? 42,
          bucket: params.bucket ?? "week",
        },
      }),
      providesTags: ["Analytics"],
    }),

    // GET /kpis/version-velocity - Monthly version release count
    getVersionVelocity: builder.query<VersionVelocity, { months?: number }>({
      query: (params) => ({
        url: "/kpis/version-velocity",
        params: {
          months: params.months ?? 6,
        },
      }),
      providesTags: ["Analytics"],
    }),

    // GET /kpis/top-prompts - Top performing prompts
    getTopPrompts: builder.query<
      TopPrompts,
      { limit?: number; period_days?: number }
    >({
      query: (params) => ({
        url: "/kpis/top-prompts",
        params: {
          limit: params.limit ?? 10,
          period_days: params.period_days ?? 30,
        },
      }),
      providesTags: ["Analytics"],
    }),

    // GET /kpis/experiments - Active A/B experiments
    getExperimentsAnalytics: builder.query<Experiments, void>({
      query: () => "/kpis/experiments",
      providesTags: ["Analytics"],
    }),
  }),
});

export const {
  useGetSummaryQuery,
  useGetUsageTrendQuery,
  useGetVersionVelocityQuery,
  useGetTopPromptsQuery,
  useGetExperimentsAnalyticsQuery,
} = kpisApi;
