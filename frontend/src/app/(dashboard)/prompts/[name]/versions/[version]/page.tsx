"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useGetVersionQuery, useGetVersionsQuery, useRollbackMutation } from "@/features/prompts/promptsApi";
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
import {
  ArrowLeft,
  Edit,
  GitBranch,
  Calendar,
  User,
  Code,
  Rocket,
  BarChart3,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function PromptVersionPage() {
  const params = useParams();
  const router = useRouter();
  const promptName = params.name as string;
  const version = parseInt(params.version as string);
  const { canEdit } = useRole();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: prompt, isLoading, error } = useGetVersionQuery({
    name: promptName,
    version: version,
  });
  const {
    data: versionsData,
    isLoading: versionsLoading,
    isError: versionsError,
  } = useGetVersionsQuery(promptName);
  const [rollback, { isLoading: isRollingBack }] = useRollbackMutation();

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
          <p className="text-destructive">Version not found</p>
          <Link href="/prompts">
            <Button variant="outline" className="mt-4">
              Back to Prompts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const versions = versionsData?.items ?? [];
  const isPromptOwner = user ? prompt.created_by === user.id : false;
  const canManagePrompt = canEdit && isPromptOwner;

  const handleRollback = async (targetVersion: number) => {
    try {
      const result = await rollback({
        name: promptName,
        version: targetVersion,
      }).unwrap();
      toast.success(
        `Rolled back to version ${targetVersion}. New version ${result.version} created.`,
      );
      router.push(`/prompts/${promptName}`);
    } catch (err: any) {
      const message =
        err?.data?.detail || "Failed to rollback. Please try again.";
      toast.error(message);
    }
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
            {prompt.active ? (
              <Badge
                variant="secondary"
                className="bg-success/10 text-success border-success/20"
              >
                Active
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-warning/10 text-warning border-warning/20"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Old Version
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
              <Button
                className="gap-2"
                onClick={() => router.push(`/prompts/${promptName}?edit=true`)}
              >
                <Edit className="h-4 w-4" />
                Edit Prompt
              </Button>
            )}
            {canEdit && !prompt.active && (
              <Button
                onClick={() => router.push(`/prompts/${promptName}`)}
                className="gap-2"
              >
                <GitBranch className="h-4 w-4" />
                View Active Version
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
                <div className="rounded-md bg-secondary/20 border border-border/50 p-4 min-h-[100px]">
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
                  {versions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4 transition-colors hover:bg-background/80"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-secondary/50 text-muted-foreground"
                          >
                            <GitBranch className="mr-1 h-3 w-3" />
                            v{item.version}
                          </Badge>
                          {item.active && (
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
                          {item.template}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            User #{item.created_by}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/prompts/${promptName}/versions/${item.version}`,
                            )
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          View
                        </Button>
                        {canManagePrompt && !item.active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(item.version)}
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
              <div className="text-center py-12 text-muted-foreground">
                Deployments will be implemented in Phase 4
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
