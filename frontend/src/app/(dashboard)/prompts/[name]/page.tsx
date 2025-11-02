"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGetPromptQuery, useGetVersionsQuery, useRollbackMutation } from "@/features/prompts/promptsApi";
import { useGetDeploymentHistoryQuery } from "@/features/deployments/deploymentsApi";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PromptPreview } from "@/components/prompts/PromptPreview";
import { PromptEditor } from "@/components/prompts/PromptEditor";
import { TestSuitePanel } from "@/components/tests/TestSuitePanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  GitBranch,
  Calendar,
  User,
  Code,
  Rocket,
  BarChart3,
  RotateCcw,
  CheckCircle2,
  FlaskConical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Environment } from "@/types/deployments";

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const promptName = params.name as string;
  const { canEdit } = useRole();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: prompt, isLoading, error } = useGetPromptQuery(promptName);
  const {
    data: versionsData,
    isLoading: versionsLoading,
    isError: versionsError,
  } = useGetVersionsQuery(promptName);
  const [rollback, { isLoading: isRollingBack }] = useRollbackMutation();
  const envHistoryLimit = 30;
  const devHistory = useGetDeploymentHistoryQuery(
    { environment: "dev", prompt: promptName, limit: envHistoryLimit },
    { skip: !promptName },
  );
  const stagingHistory = useGetDeploymentHistoryQuery(
    { environment: "staging", prompt: promptName, limit: envHistoryLimit },
    { skip: !promptName },
  );
  const productionHistory = useGetDeploymentHistoryQuery(
    { environment: "production", prompt: promptName, limit: envHistoryLimit },
    { skip: !promptName },
  );

  useEffect(() => {
    const editQuery = searchParams.get("edit") === "true";
    setIsEditOpen((prev) => (prev === editQuery ? prev : editQuery));
  }, [searchParams]);

  const versions = versionsData?.items ?? [];
  const environmentHistory = [
    { env: "dev" as Environment, label: "Development", query: devHistory },
    { env: "staging" as Environment, label: "Staging", query: stagingHistory },
    { env: "production" as Environment, label: "Production", query: productionHistory },
  ];

  const handleRollback = async (version: number) => {
    try {
      const result = await rollback({ name: promptName, version }).unwrap();
      toast.success(`Rolled back to version ${version}. New version ${result.version} created.`);
      // RTK Query will automatically refetch the data due to cache invalidation
    } catch (error: any) {
      const errorMessage = error?.data?.detail || "Failed to rollback. Please try again.";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] space-y-6">
        <Skeleton className="h-10 w-64 bg-secondary/20" />
        <Skeleton className="h-96 w-full bg-secondary/20" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="max-w-[1400px]">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Prompt not found</p>
          <Link href="/prompts">
            <Button variant="outline" className="mt-4">
              Back to Prompts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPromptOwner = user ? prompt.created_by === user.id : false;
  const canManagePrompt = canEdit && isPromptOwner;

  const updateEditQuery = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      params.set("edit", "true");
    } else {
      params.delete("edit");
    }
    const newQuery = params.toString();
    router.replace(
      newQuery ? `${pathname}?${newQuery}` : pathname,
      { scroll: false },
    );
  };

  const handleOpenEdit = () => {
    setIsEditOpen(true);
    updateEditQuery(true);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    updateEditQuery(false);
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/prompts">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{prompt.name}</h1>
            <Badge
              variant="secondary"
              className="bg-secondary/50 text-muted-foreground"
            >
              <GitBranch className="w-3 h-3 mr-1" />v{prompt.version}
            </Badge>
            {prompt.active && (
              <Badge
                variant="secondary"
                className="bg-success/10 text-success border-success/20"
              >
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDistanceToNow(new Date(prompt.created_at), {
                addSuffix: true,
              })}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              User #{prompt.created_by}
            </span>
          </div>
        </div>

        {(canManagePrompt || canEdit) && (
          <div className="flex gap-2">
            {canManagePrompt && (
              <Button className="gap-2" onClick={handleOpenEdit}>
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setActiveTab("versions")}
              >
                <GitBranch className="h-4 w-4" />
                Versions
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (open) {
            handleOpenEdit();
          } else {
            handleCloseEdit();
          }
        }}
      >
        <DialogContent
          size="xl"
          className="dark scrollbar-slim max-h-[92vh] overflow-y-auto border border-border/60 bg-background p-8 text-foreground sm:rounded-xl"
        >
          <DialogHeader>
            <DialogTitle>Edit {prompt.name}</DialogTitle>
            <DialogDescription>
              Update the template to create a new version.
            </DialogDescription>
          </DialogHeader>
          <PromptEditor
            prompt={prompt}
            onCancel={handleCloseEdit}
            onSuccess={() => handleCloseEdit()}
          />
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="overview" className="gap-2">
            <Code className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="versions" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="deployments" className="gap-2">
            <Rocket className="h-4 w-4" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Template</CardTitle>
                <CardDescription>
                  The prompt template with variable placeholders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="scrollbar-slim rounded-md bg-secondary/20 border border-border/50 p-4 min-h-[100px] max-h-[480px] overflow-y-auto">
                  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words">
                    {prompt.template}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Variables */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Variables</CardTitle>
                <CardDescription>
                  Dynamic values that can be injected into the template
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prompt.variables.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {prompt.variables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="bg-secondary/50 text-foreground font-mono"
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No variables defined
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Interactive Preview
            </h3>
            <PromptPreview
              template={prompt.template}
              variables={prompt.variables}
            />
          </div>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                View all versions and rollback if needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versionsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-secondary/20" />
                  <Skeleton className="h-20 w-full bg-secondary/20" />
                  <Skeleton className="h-20 w-full bg-secondary/20" />
                </div>
              ) : versionsError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
                  Failed to load version history.
                </div>
              ) : versions.length > 0 ? (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4 transition-colors hover:bg-background/80"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-secondary/50 text-muted-foreground"
                          >
                            <GitBranch className="mr-1 h-3 w-3" />
                            v{version.version}
                          </Badge>
                          {version.active && (
                            <Badge
                              variant="secondary"
                              className="bg-success/10 text-success border-success/20"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="mb-2 line-clamp-2 font-mono text-sm text-muted-foreground">
                          {version.template}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(version.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            User #{version.created_by}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/prompts/${promptName}/versions/${version.version}`,
                            )
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          View
                        </Button>
                        {canManagePrompt && !version.active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(version.version)}
                            disabled={isRollingBack}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No versions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-6">
          <TestSuitePanel promptName={prompt.name} />
        </TabsContent>

        {/* Deployments Tab */}
        <TabsContent value="deployments">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Deployments</CardTitle>
              <CardDescription>
                See where this prompt is deployed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {environmentHistory.map(({ env, label, query }) => {
                  const isLoadingEnv = query.isLoading;
                  const isErrorEnv = query.isError;
                  const deploymentsForPrompt =
                    query.data?.items.filter((item) => item.prompt.name === prompt.name) ?? [];
                  const latestDeployment = deploymentsForPrompt[0];
                  const deployedByLabel =
                    latestDeployment?.user?.email ??
                    (latestDeployment ? `User #${latestDeployment.deployed_by}` : null);

                  return (
                    <Card
                      key={env}
                      className="border border-border/50 bg-background/40 rounded-lg shadow-sm"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between gap-2">
                          {label}
                          {latestDeployment && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                env === "production"
                                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                                  : env === "staging"
                                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                                    : "border-blue-500/30 bg-blue-500/10 text-blue-500",
                              )}
                            >
                              v{latestDeployment.prompt.version}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        {isLoadingEnv ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full bg-secondary/20" />
                            <Skeleton className="h-4 w-3/4 bg-secondary/20" />
                            <Skeleton className="h-4 w-2/3 bg-secondary/20" />
                          </div>
                        ) : isErrorEnv ? (
                          <p className="text-sm text-destructive">
                            Failed to load deployments for {label.toLowerCase()}.
                          </p>
                        ) : latestDeployment ? (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                Last deployment
                              </span>
                              <p className="font-medium text-foreground">
                                {formatDistanceToNow(new Date(latestDeployment.deployed_at), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            {deployedByLabel && (
                              <div className="text-xs flex items-center gap-2 text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{deployedByLabel}</span>
                              </div>
                            )}
                            <div className="text-xs flex items-center gap-2 text-muted-foreground">
                              <GitBranch className="h-3 w-3" />
                              <span>Prompt version v{latestDeployment.prompt.version}</span>
                            </div>
                            {deploymentsForPrompt.length > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {deploymentsForPrompt.length - 1} more deployment
                                {deploymentsForPrompt.length - 1 === 1 ? "" : "s"} recorded
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            This prompt has not been deployed to {label.toLowerCase()} yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Manage deployments and promotion workflows or spin up a new deployment for this
                  prompt from the main deployments dashboard.
                </span>
                <Button asChild variant="outline">
                  <Link href={`/deployments?prompt=${encodeURIComponent(prompt.name)}`}>
                    Open Deployments
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Track performance and usage metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Analytics will be implemented in Phase 6
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
