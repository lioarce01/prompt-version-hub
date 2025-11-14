"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  GitBranch,
  Rocket,
  TrendingUp,
  FlaskConical,
  AlertCircle,
} from "lucide-react";
import {
  useGetSummaryQuery,
  useGetUsageTrendQuery,
  useGetVersionVelocityQuery,
  useGetTopPromptsQuery,
  useGetExperimentsAnalyticsQuery,
} from "@/hooks/useKpis";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  formatRelativeDate,
  formatSuccessRate,
  formatChartDate,
  formatChartMonth,
} from "@/lib/utils";
import { useAuth } from "@/hooks/auth/useAuth";

export default function DashboardPage() {
  // IMPORTANT: All hooks must be called before any early returns (Rules of Hooks)
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  // Fetch all KPI data
  // Using isPending instead of isLoading - only true on initial load, not on background refetch
  const {
    data: summary,
    isPending: summaryPending,
    error: summaryError,
  } = useGetSummaryQuery();
  const { data: usageTrend, isPending: trendPending } = useGetUsageTrendQuery({
    period_days: 42,
    bucket: "week",
  });
  const { data: versionVelocity, isPending: velocityPending } =
    useGetVersionVelocityQuery({
      months: 6,
    });
  const { data: topPrompts, isPending: topPromptsPending } =
    useGetTopPromptsQuery({
      limit: 4,
      period_days: 30,
    });
  const { data: experiments, isPending: experimentsPending } =
    useGetExperimentsAnalyticsQuery();

  // Now we can do early returns after all hooks are called
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return <DashboardSkeleton />;
  }

  // Show skeleton only on initial load (when no data exists yet)
  // This prevents flickering on background refetch
  const isPending =
    summaryPending ||
    trendPending ||
    velocityPending ||
    topPromptsPending ||
    experimentsPending;
  if (isPending) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (summaryError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // KPI Cards configuration
  const kpis = [
    {
      title: "Total Prompts",
      value: summary?.totals.prompts.toString() || "0",
      description: "unique prompts",
      icon: Activity,
    },
    {
      title: "Active Prompts",
      value: summary?.totals.active_prompts.toString() || "0",
      description: "latest version active",
      icon: GitBranch,
    },
    {
      title: "Deployments",
      value: summary?.totals.deployments.toString() || "0",
      description: "total deployments",
      icon: Rocket,
    },
    {
      title: "Experiments Running",
      value: summary?.totals.experiments.toString() || "0",
      description: "A/B tests active",
      icon: FlaskConical,
    },
  ];

  // Transform usage trend data for chart
  const usageChartData =
    usageTrend?.map((point) => ({
      week: formatChartDate(point.period),
      executions: point.executions,
      failures: point.failures,
    })) || [];

  // Transform version velocity data for chart
  const velocityChartData =
    versionVelocity?.map((point) => ({
      month: formatChartMonth(point.month),
      releases: point.releases,
    })) || [];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Monitor prompt adoption, experiment velocity, and delivery health.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card
            key={item.title}
            className="border-border/60 bg-card/50 backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {item.value}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Usage Trend Chart */}
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Prompt Executions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Weekly runs vs failures
              </p>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            <div className="h-full w-full">
              {usageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageChartData}>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis dataKey="week" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="executions"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="failures"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No usage data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Version Velocity Chart */}
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Version Velocity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monthly releases shipped
              </p>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            <div className="h-full w-full">
              {velocityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityChartData}>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    cursor={{ fill: "#111", opacity: 0.3 }}
                    contentStyle={{
                      backgroundColor: "#111",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="releases"
                    fill="#a855f7"
                    radius={[6, 6, 0, 0]}
                    activeBar={{ fill: "#7c3aed" }}
                  />
                </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No version data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Prompts and Experiments */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Top Performing Prompts */}
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Top Performing Prompts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ranked by executions (last 30 days)
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[294px] overflow-y-auto pr-2 scrollbar-slim">
            {topPrompts && topPrompts.length > 0 ? (
              topPrompts.map((prompt: any, index: number) => (
                <div
                  key={`${prompt.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{prompt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last updated {formatRelativeDate(prompt.last_updated)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{prompt.executions.toLocaleString()} runs</span>
                    <Badge
                      variant="outline"
                      className="border-success/30 bg-success/10 text-success"
                    >
                      {formatSuccessRate(prompt.success_rate)} success
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                No prompt usage data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Experiments Snapshot */}
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Experiments Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">Active A/B tests</p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[294px] overflow-y-auto pr-2 scrollbar-slim">
            {experiments && experiments.length > 0 ? (
              experiments.map((experiment, index: number) => (
                <div
                  key={`${experiment.experiment}-${experiment.prompt}-${index}`}
                  className="rounded-lg border border-border/60 bg-background/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {experiment.prompt}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-border/60 text-xs capitalize"
                    >
                      {experiment.arms.length} variants
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {experiment.arms.map((arm: any) => (
                      <div
                        key={`${experiment.experiment}-v${arm.version}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">
                          v{arm.version} ({(arm.weight * 100).toFixed(0)}%)
                        </span>
                        <span className="text-success">
                          {arm.success_rate !== null
                            ? formatSuccessRate(arm.success_rate)
                            : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                No active experiments
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
