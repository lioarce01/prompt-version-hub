"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useGetVersionQuery } from "@/features/prompts/promptsApi";
import { useRole } from "@/hooks/useRole";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PromptVersionPage() {
  const params = useParams();
  const router = useRouter();
  const promptName = params.name as string;
  const version = parseInt(params.version as string);
  const { canEdit } = useRole();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: prompt, isLoading, error } = useGetVersionQuery({
    name: promptName,
    version: version,
  });

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
          <Link href="/">
            <Button variant="outline" className="mt-4">
              Back to Prompts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/">
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

        {canEdit && (
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/prompts/${promptName}`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              View Active Version
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setActiveTab("versions")}
            >
              <GitBranch className="h-4 w-4" />
              Versions
            </Button>
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
              <div className="text-center py-12 text-muted-foreground">
                Version history will be implemented in Phase 3
              </div>
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
