"use client";

import { useState } from "react";
import {
  useGetCurrentDeploymentQuery,
  useGetDeploymentHistoryQuery,
  useGetAllDeploymentHistoryQuery,
} from "@/features/deployments/deploymentsApi";
import { useRole } from "@/hooks/useRole";
import { EnvironmentCard } from "@/components/deployments/EnvironmentCard";
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

const ENVIRONMENTS: Environment[] = ["dev", "staging", "production"];

export default function DeploymentsPage() {
  const { canEdit } = useRole();
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedEnvironmentForDeploy, setSelectedEnvironmentForDeploy] =
    useState<Environment>("dev");
  const [historyEnvironmentFilter, setHistoryEnvironmentFilter] =
    useState<Environment | "all">("all");
  const [historyPage, setHistoryPage] = useState(0);
  const limit = 5;

  // Fetch current deployments for all environments
  const { data: devDeployment, isLoading: devLoading } =
    useGetCurrentDeploymentQuery({ environment: "dev" });
  const { data: stagingDeployment, isLoading: stagingLoading } =
    useGetCurrentDeploymentQuery({ environment: "staging" });
  const { data: productionDeployment, isLoading: productionLoading } =
    useGetCurrentDeploymentQuery({ environment: "production" });

  // Fetch deployment history based on filter
  const shouldFetchAll = historyEnvironmentFilter === "all";

  const { data: historyDataFiltered, isLoading: historyLoadingFiltered } =
    useGetDeploymentHistoryQuery(
      {
        environment: historyEnvironmentFilter as Environment,
        limit,
        offset: historyPage * limit,
      },
      { skip: shouldFetchAll }
    );

  const { data: historyDataAll, isLoading: historyLoadingAll } =
    useGetAllDeploymentHistoryQuery(
      {
        limit,
        offset: historyPage * limit,
      },
      { skip: !shouldFetchAll }
    );

  const historyData = shouldFetchAll ? historyDataAll : historyDataFiltered;
  const historyLoading = shouldFetchAll ? historyLoadingAll : historyLoadingFiltered;

  const handleOpenDeployModal = (environment: Environment) => {
    setSelectedEnvironmentForDeploy(environment);
    setIsDeployModalOpen(true);
  };

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

      {/* Environment Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <EnvironmentCard
          environment="dev"
          deployment={devDeployment}
          isLoading={devLoading}
          onDeploy={() => handleOpenDeployModal("dev")}
          canDeploy={canEdit}
        />
        <EnvironmentCard
          environment="staging"
          deployment={stagingDeployment}
          isLoading={stagingLoading}
          onDeploy={() => handleOpenDeployModal("staging")}
          canDeploy={canEdit}
        />
        <EnvironmentCard
          environment="production"
          deployment={productionDeployment}
          isLoading={productionLoading}
          onDeploy={() => handleOpenDeployModal("production")}
          canDeploy={canEdit}
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
                setHistoryEnvironmentFilter(value as Environment | "all");
                setHistoryPage(0); // Reset pagination
              }}
            >
              <SelectTrigger className="w-[180px]">
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
                No deployment history yet
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
      />
    </div>
  );
}
