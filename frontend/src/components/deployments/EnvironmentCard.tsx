import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, Clock, User, GitBranch, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Environment } from "@/types/deployments";

export interface DeploymentData {
  id: number;
  prompt?: {
    id: number;
    name: string;
    version: number;
    template: string;
  };
  user?: {
    id: number;
    email: string;
  };
  deployed_at: string;
  environment: string;
  prompt_id: number;
  deployed_by: number;
}

interface EnvironmentCardProps {
  environment: Environment;
  deployment: DeploymentData | null | undefined;
  isLoading?: boolean;
  onDeploy: () => void;
  canDeploy: boolean;
  promptName?: string;
}

const ENVIRONMENT_CONFIG: Record<
  Environment,
  { label: string; badgeClass: string }
> = {
  dev: {
    label: "Development",
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  staging: {
    label: "Staging",
    badgeClass: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  production: {
    label: "Production",
    badgeClass: "bg-green-500/10 text-green-500 border-green-500/30",
  },
};

export function EnvironmentCard({
  environment,
  deployment,
  isLoading,
  onDeploy,
  canDeploy,
  promptName,
}: EnvironmentCardProps) {
  const config = ENVIRONMENT_CONFIG[environment];

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg">{config.label}</CardTitle>
        <Badge variant="outline" className={config.badgeClass}>
          {environment}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {deployment && deployment.prompt && deployment.user ? (
          <>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {deployment.prompt.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GitBranch className="h-3 w-3" />
                    <span>Version {deployment.prompt.version}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    Deployed{" "}
                    {formatDistanceToNow(new Date(deployment.deployed_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>by {deployment.user.email}</span>
                </div>
              </div>
            </div>

            {canDeploy && (
              <Button onClick={onDeploy} className="w-full" variant="outline" size="sm">
                <Rocket className="h-4 w-4 mr-2" />
                Deploy New Version
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {promptName
                ? `No deployments for ${promptName} in this environment yet.`
                : "No deployment in this environment yet."}
            </p>
            {canDeploy && (
              <Button onClick={onDeploy} size="sm">
                <Rocket className="h-4 w-4 mr-2" />
                Deploy First Version
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
