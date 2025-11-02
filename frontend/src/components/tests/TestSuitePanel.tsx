"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useGetTestSuiteQuery,
  useCreateTestCaseMutation,
  useDeleteTestCaseMutation,
  useGenerateTestCasesMutation,
  useRunTestsMutation,
} from "@/features/tests/testsApi";
import type { TestCategory, CreateTestCaseRequest, TestCase } from "@/types/tests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Play, RefreshCcw, Wand2 } from "lucide-react";

interface TestSuitePanelProps {
  promptName: string;
}

const CATEGORY_OPTIONS: { value: TestCategory; label: string }[] = [
  { value: "happy_path", label: "Happy path" },
  { value: "edge_case", label: "Edge case" },
  { value: "boundary", label: "Boundary" },
  { value: "negative", label: "Negative" },
];

export function TestSuitePanel({ promptName }: TestSuitePanelProps) {
  const [newCase, setNewCase] = useState<CreateTestCaseRequest>({
    name: "",
    input_text: "{}",
    expected_output: "",
    category: "happy_path",
  });
  const [generateCount, setGenerateCount] = useState("3");

  const {
    data: suite,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useGetTestSuiteQuery(promptName);

  const [createCase, { isLoading: isCreating }] = useCreateTestCaseMutation();
  const [deleteCase, { isLoading: isDeleting }] = useDeleteTestCaseMutation();
  const [generateCases, { isLoading: isGenerating }] = useGenerateTestCasesMutation();
  const [runTests, { isLoading: isRunning }] = useRunTestsMutation();

  const promptVariables = useMemo(() => suite?.prompt_variables ?? [], [suite]);

  const handleCreateCase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCase.name.trim()) {
      toast.error("Test case name is required");
      return;
    }
    try {
      const payload: CreateTestCaseRequest = {
        ...newCase,
        expected_output: newCase.expected_output?.trim() ? newCase.expected_output : undefined,
      };
      await createCase({ promptName, body: payload }).unwrap();
      toast.success("Test case created");
      setNewCase({
        name: "",
        input_text: "{}",
        expected_output: "",
        category: "happy_path",
      });
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to create test case");
    }
  };

  const handleDeleteCase = async (testCase: TestCase) => {
    try {
      await deleteCase({ id: testCase.id, promptName }).unwrap();
      toast.success("Test case deleted");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to delete test case");
    }
  };

  const handleGenerateCases = async () => {
    let count = Number(generateCount) || 3;
    count = Math.min(Math.max(count, 1), 20);
    try {
      await generateCases({ promptName, body: { count } }).unwrap();
      toast.success(`Generated ${count} AI test cases`);
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to generate test cases");
    }
  };

  const handleRunTests = async (caseIds?: number[]) => {
    try {
      await runTests({ promptName, body: { case_ids: caseIds } }).unwrap();
      toast.success(caseIds ? "Test executed" : "Test suite executed");
      await refetch();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to run tests");
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (isError || !suite) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load test suite. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Test Cases</CardTitle>
              <p className="text-sm text-muted-foreground">
                Validate prompt behaviour across scenarios
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={20}
                value={generateCount}
                onChange={(e) => setGenerateCount(e.target.value)}
                className="w-20"
              />
              <Button
                onClick={handleGenerateCases}
                disabled={isGenerating}
                className="gap-2"
                variant="outline"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                AI Generate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateCase} className="grid gap-3 rounded-lg border border-border/60 bg-background/50 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Case name"
                  value={newCase.name}
                  onChange={(e) => setNewCase((current) => ({ ...current, name: e.target.value }))}
                  required
                />
                <Select
                  value={newCase.category}
                  onValueChange={(value: TestCategory) => setNewCase((current) => ({ ...current, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                rows={4}
                value={newCase.input_text}
                onChange={(e) => setNewCase((current) => ({ ...current, input_text: e.target.value }))}
                placeholder="JSON input payload"
              />

              <Textarea
                rows={3}
                value={newCase.expected_output}
                onChange={(e) => setNewCase((current) => ({ ...current, expected_output: e.target.value }))}
                placeholder="Expected output (optional)"
              />

              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Test Case
              </Button>
            </form>

            <div className="space-y-3">
              {suite.cases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No test cases yet. Create one manually or generate with AI.
                </p>
              ) : (
                suite.cases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="rounded-lg border border-border/60 bg-background/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{testCase.name}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {testCase.category.replace("_", " ")}
                          </Badge>
                          {testCase.auto_generated && (
                            <Badge variant="secondary" className="text-xs">AI</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {formatDistanceToNow(new Date(testCase.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunTests([testCase.id])}
                          disabled={isRunning}
                          className="gap-2"
                        >
                          {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Run
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCase(testCase)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Input:</span>
                        <pre className="mt-1 overflow-x-auto rounded-md bg-background/60 p-3 text-[11px] leading-relaxed">
                          {testCase.input_text}
                        </pre>
                      </div>
                      {testCase.expected_output && (
                        <div>
                          <span className="font-medium text-foreground">Expected:</span>
                          <pre className="mt-1 overflow-x-auto rounded-md bg-background/60 p-3 text-[11px] leading-relaxed">
                            {testCase.expected_output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {suite.cases.length > 0 && (
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => handleRunTests()}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Run All Cases
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Prompt Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Active version</p>
              <p>v{suite.prompt_version}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Variables</p>
              {promptVariables.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {promptVariables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p>None</p>
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">Template</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-border/60 bg-background/40 p-3 text-xs leading-relaxed">
                {suite.prompt_template}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg">Execution History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {suite.runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No executions recorded yet.</p>
            ) : (
              suite.runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border border-border/60 bg-background/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          v{run.prompt_version}
                        </Badge>
                        {run.test_case_id && (
                          <span className="text-xs text-muted-foreground">
                            Case #{run.test_case_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(run.executed_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge
                      variant={run.success ? "secondary" : "outline"}
                      className={cn(
                        "text-xs",
                        run.success
                          ? "bg-success/10 text-success border-success/20"
                          : run.error_message
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-muted/20 text-muted-foreground"
                      )}
                    >
                      {run.success === true
                        ? "Passed"
                        : run.success === false
                          ? "Failed"
                          : "Pending"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {run.output_text && (
                      <div>
                        <span className="font-medium text-foreground">Output:</span>
                        <pre className="mt-1 whitespace-pre-wrap rounded-md bg-background/60 p-3 text-[11px] leading-relaxed">
                          {run.output_text}
                        </pre>
                      </div>
                    )}
                    {run.error_message && (
                      <p className="text-destructive">Error: {run.error_message}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
