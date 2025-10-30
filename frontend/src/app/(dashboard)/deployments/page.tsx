"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useGetCurrentDeploymentQuery,
  useGetDeploymentHistoryQuery,
  useGetAllDeploymentHistoryQuery,
} from "@/features/deployments/deploymentsApi";
import { useGetPromptsQuery } from "@/features/prompts/promptsApi";
import { useRole } from "@/hooks/useRole";
import { EnvironmentCard, type DeploymentData } from "@/components/deployments/EnvironmentCard";
import { DeployModal } from "@/components/deployments/DeployModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Rocket,
  History,
  GitBranch,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Environment } from "@/types/deployments";

export default function DeploymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const promptParam = searchParams.get("prompt") ?? "";
  const envParamRaw = (searchParams.get("env") ?? "all").toLowerCase();
  const validEnvFilters = new Set<Environment | "all">([
    "all",
    "dev",
    "staging",
    "production",
  ]);
  const envParam = validEnvFilters.has(envParamRaw as Environment | "all")
    ? (envParamRaw as Environment | "all")
    : "all";
  const { canEdit } = useRole();

  const [promptFilter, setPromptFilter] = useState(promptParam);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedEnvironmentForDeploy, setSelectedEnvironmentForDeploy] =
    useState<Environment>("dev");
  const [historyEnvironmentFilter, setHistoryEnvironmentFilter] =
    useState<Environment | "all">(envParam);
  const [historyPage, setHistoryPage] = useState(0);
  const limit = 5;

  useEffect(() => {
    setPromptFilter((current) => {
      if (current === promptParam) {
        return current;
      }
      setHistoryPage(0);
      return promptParam;
    });
  }, [promptParam]);

  useEffect(() => {
    setHistoryEnvironmentFilter((current) => {
      if (current === envParam) {
        return current;
      }
      setHistoryPage(0);
      return envParam;
    });
  }, [envParam]);

  const { data: promptData, isLoading: promptOptionsLoading } = useGetPromptsQuery({
    owned: true,
    latest_only: true,
    sort_by: "name",
    order: "asc",
    limit: 100,
  });

  const promptOptions = useMemo(() => promptData?.items ?? [], [promptData]);
  const selectPromptValue = promptFilter || "all";
  const promptScopeLabel = useMemo(() => {
    if (!promptFilter) {
      return "All prompts";
    }
    const match = promptOptions.find((prompt) => prompt.name === promptFilter);
    return match?.name ?? promptFilter;
  }, [promptFilter, promptOptions]);

  const handlePromptScopeChange = (value: string) => {
    const nextValue = value === "all" ? "" : value;
    if (nextValue === promptFilter) {
      return;
    }
    setPromptFilter(nextValue);
    setHistoryPage(0);

    const params = new URLSearchParams(searchParams.toString());
    if (nextValue) {
      params.set("prompt", nextValue);
    } else {
      params.delete("prompt");
    }
    params.set("env", historyEnvironmentFilter);
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false }
    );
  };

  const devParams = useMemo(
    () =>
      promptFilter
        ? { environment: "dev" as Environment, prompt: promptFilter }
        : { environment: "dev" as Environment },
    [promptFilter]
  );
  const stagingParams = useMemo(
    () =>
      promptFilter
        ? { environment: "staging" as Environment, prompt: promptFilter }
        : { environment: "staging" as Environment },
    [promptFilter]
  );
  const productionParams = useMemo(
    () =>
      promptFilter
        ? { environment: "production" as Environment, prompt: promptFilter }
        : { environment: "production" as Environment },
    [promptFilter]
  );

  // Fetch current deployments for all environments
  const {
    data: devDeployment,
    isLoading: devLoading,
  } = useGetCurrentDeploymentQuery(devParams, {
    refetchOnMountOrArgChange: true,
  });
  const {
    data: stagingDeployment,
    isLoading: stagingLoading,
  } = useGetCurrentDeploymentQuery(stagingParams, {
    refetchOnMountOrArgChange: true,
  });
  const {
    data: productionDeployment,
    isLoading: productionLoading,
  } = useGetCurrentDeploymentQuery(productionParams, {
    refetchOnMountOrArgChange: true,
  });

  // Fetch deployment history based on filter
  const shouldFetchAll = historyEnvironmentFilter === "all";
  const effectiveHistoryEnvironment = shouldFetchAll
    ? "dev"
    : historyEnvironmentFilter;

  const historyQueryArgs = useMemo(
    () => ({
      environment: effectiveHistoryEnvironment as Environment,
      limit,
      offset: historyPage * limit,
      ...(promptFilter ? { prompt: promptFilter } : {}),
    }),
    [effectiveHistoryEnvironment, historyPage, limit, promptFilter]
  );

  const mergedHistoryLimit = promptFilter ? 100 : limit;

  const allHistoryQueryArgs = useMemo(
    () => ({
      limit: mergedHistoryLimit,
      offset: promptFilter ? 0 : historyPage * mergedHistoryLimit,
      ...(promptFilter ? { prompt: promptFilter } : {}),
    }),
    [mergedHistoryLimit, promptFilter, historyPage]
  );

  const { data: historyDataFiltered, isLoading: historyLoadingFiltered } =
    useGetDeploymentHistoryQuery(historyQueryArgs, { skip: shouldFetchAll });

  const { data: historyDataAll, isLoading: historyLoadingAll } =
    useGetAllDeploymentHistoryQuery(allHistoryQueryArgs, {
      skip: !(shouldFetchAll || promptFilter),
    });

  const historyData = shouldFetchAll ? historyDataAll : historyDataFiltered;
  const historyLoading = shouldFetchAll
    ? historyLoadingAll || historyLoadingFiltered
    : historyLoadingFiltered;

  const scopedDeploymentsByEnv = useMemo<
    Partial<Record<Environment, DeploymentData>>
  >(() => {
    if (!promptFilter || !historyDataAll?.items?.length) {
      return {};
    }

    const map: Partial<Record<Environment, DeploymentData>> = {};
    for (const item of historyDataAll.items) {
      if (!item) {
        continue;
      }
      const environmentKey = item.environment as Environment;
      if (!map[environmentKey]) {
        map[environmentKey] = item as DeploymentData;
      }
    }
    return map;
  }, [promptFilter, historyDataAll?.items]);

  const handleOpenDeployModal = (environment: Environment) => {
    setSelectedEnvironmentForDeploy(environment);
    setIsDeployModalOpen(true);
  };

  const deriveCardState = (
    environment: Environment,
    fallbackDeployment: typeof devDeployment,
    fallbackLoading: boolean
  ) => {
    if (!promptFilter) {
      return { deployment: fallbackDeployment ?? null, isLoading: fallbackLoading };
    }
    const scopedDeployment = scopedDeploymentsByEnv[environment] ?? null;
    return {
      deployment: scopedDeployment,
      isLoading: historyLoadingAll,
    };
  };

  const devCardState = deriveCardState("dev", devDeployment, devLoading);
  const stagingCardState = deriveCardState("staging", stagingDeployment, stagingLoading);
  const productionCardState = deriveCardState("production", productionDeployment, productionLoading);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Rocket className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Deployments</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Manage prompt deployments across environments
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {promptFilter
            ? `Showing deployments for ${promptScopeLabel}.`
            : "Showing deployments for all prompts you own."}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={selectPromptValue}
            onValueChange={handlePromptScopeChange}
            disabled={promptOptionsLoading}
          >
            <SelectTrigger className="w-[220px] bg-background/60 border-border/50 text-foreground">
              <SelectValue placeholder="Select prompt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prompts</SelectItem>
              {promptOptions.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.name}>
                  {prompt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {promptFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-foreground/80"
              onClick={() => handlePromptScopeChange("all")}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Environment Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <EnvironmentCard
          environment="dev"
          deployment={devCardState.deployment}
          isLoading={devCardState.isLoading}
          onDeploy={() => handleOpenDeployModal("dev")}
          canDeploy={canEdit}
          promptName={promptFilter || undefined}
        />
        <EnvironmentCard
          environment="staging"
          deployment={stagingCardState.deployment}
          isLoading={stagingCardState.isLoading}
          onDeploy={() => handleOpenDeployModal("staging")}
          canDeploy={canEdit}
          promptName={promptFilter || undefined}
        />
        <EnvironmentCard
          environment="production"
          deployment={productionCardState.deployment}
          isLoading={productionCardState.isLoading}
          onDeploy={() => handleOpenDeployModal("production")}
          canDeploy={canEdit}
          promptName={promptFilter || undefined}
        />
      </div>

      {/* Deployment History */}
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Deployment History</CardTitle>
            </div>
            <Select
              value={historyEnvironmentFilter}
              onValueChange={(value) => {
                const nextEnv = value as Environment | "all";
                setHistoryEnvironmentFilter(nextEnv);
                setHistoryPage(0);

                const params = new URLSearchParams(searchParams.toString());
                if (promptFilter) {
                  params.set("prompt", promptFilter);
                } else {
                  params.delete("prompt");
                }
                if (nextEnv === "all") {
                  params.delete("env");
                } else {
                  params.set("env", nextEnv);
                }

                router.replace(
                  params.toString() ? `${pathname}?${params.toString()}` : pathname,
                  { scroll: false }
                );
              }}
            >
              <SelectTrigger className="w-[180px] bg-background/60 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="dev">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3"
                >
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : historyData && historyData.items.length > 0 ? (
            <>
              <div className="space-y-3">
                {historyData.items.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-start justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3 hover:bg-background/60 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">
                          {deployment.prompt.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          v{deployment.prompt.version}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            deployment.environment === "production"
                              ? "border-green-500/30 bg-green-500/10 text-green-500"
                              : deployment.environment === "staging"
                                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                                : "border-blue-500/30 bg-blue-500/10 text-blue-500"
                          }
                        >
                          {deployment.environment}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(deployment.deployed_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{deployment.user.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {(historyData.has_next || historyPage > 0) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                  <p className="text-sm text-muted-foreground">
                    Showing {historyPage * limit + 1} -{" "}
                    {historyPage * limit + historyData.items.length} of {historyData.count}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                      disabled={historyPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={!historyData.has_next}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {promptFilter
                  ? `No deployment history yet for ${promptScopeLabel}.`
                  : "No deployment history yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deploy Modal */}
      <DeployModal
        open={isDeployModalOpen}
        onOpenChange={setIsDeployModalOpen}
        defaultEnvironment={selectedEnvironmentForDeploy}
        defaultPromptName={promptFilter || undefined}
      />
    </div>
  );
}
