"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import type { Prompt } from "@/types/prompts";
import { useUpdatePromptMutation } from "@/hooks/usePrompts";
import { PromptPreview } from "./PromptPreview";
import { DiffViewer } from "./DiffViewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface PromptEditorProps {
  prompt: Prompt;
  onCancel?: () => void;
  onSuccess?: (prompt: Prompt) => void;
}

const VARIABLE_REGEX = /\{\{([\w.-]+)\}\}/g;

export function PromptEditor({
  prompt,
  onCancel,
  onSuccess,
}: PromptEditorProps) {
  const { mutateAsync: updatePrompt, isPending: isLoading } = useUpdatePromptMutation();

  const [template, setTemplate] = useState(prompt.template);
  const [variables, setVariables] = useState<string[]>(prompt.variables);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewTab, setReviewTab] = useState<"preview" | "diff" | "reference">(
    "preview",
  );

  useEffect(() => {
    setTemplate(prompt.template);
    setVariables(prompt.variables);
    setErrors({});
  }, [prompt]);

  useEffect(() => {
    const matches = template.match(VARIABLE_REGEX);
    if (matches) {
      const extracted = Array.from(
        new Set(matches.map((match) => match.replace(/\{\{|\}\}/g, ""))),
      );
      setVariables(extracted);
    } else {
      setVariables([]);
    }
  }, [template]);

  const hasChanges = useMemo(() => {
    const normalizedCurrent = template.trim();
    const normalizedOriginal = prompt.template.trim();
    return normalizedCurrent !== normalizedOriginal;
  }, [template, prompt.template]);

  const validate = () => {
    const validationErrors: Record<string, string> = {};

    if (!template.trim()) {
      validationErrors.template = "Template is required";
    } else if (!hasChanges) {
      validationErrors.template =
        "Template must be different from current version";
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedPrompt = await updatePrompt({
        name: prompt.name,
        data: {
          template,
          variables,
        },
      });

      toast.success(
        `Prompt updated successfully. New version v${updatedPrompt.version} created.`,
      );
      setTemplate(updatedPrompt.template);
      setVariables((updatedPrompt.variables as string[]) || []);
      onSuccess?.(updatedPrompt as any);
    } catch (error: any) {
      const message =
        error?.message || "Failed to update prompt. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTemplate(prompt.template);
    setVariables(prompt.variables);
    setErrors({});
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Edit Prompt
            </h2>
            <p className="text-muted-foreground">
              Update the template below to create a new version.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-secondary/50 text-muted-foreground"
          >
            Current version v{prompt.version}
          </Badge>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p className="leading-relaxed">
            Each edit creates a new version. Version v{prompt.version} remains
            accessible in the history.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <section className="space-y-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
              <header className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Template Editor
                </h3>
                <p className="text-sm text-muted-foreground">
                  Update the prompt body and detected variables will refresh
                  automatically.
                </p>
              </header>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template">
                    Template <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="template"
                    value={template}
                    onChange={(event) => {
                      setTemplate(event.target.value);
                      setErrors((prev) => ({ ...prev, template: "" }));
                    }}
                    rows={12}
                    className={`bg-background/50 border-border/50 font-mono text-sm ${
                      errors.template ? "border-destructive" : ""
                    }`}
                    placeholder="Hello {{name}}, welcome to {{app_name}}!"
                  />
                  {errors.template && (
                    <p className="text-xs text-destructive">
                      {errors.template}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {`{{variable}}`} syntax for dynamic values.
                  </p>
                </div>

                {variables.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Detected Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable: string) => (
                        <Badge
                          key={variable}
                          variant="secondary"
                          className="bg-secondary/50 text-foreground font-mono text-xs"
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : template ? (
                  <Alert className="border-warning/50 bg-warning/10 text-warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No variables detected. Use {`{{variable}}`} syntax to add
                      dynamic values.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {hasChanges && (
                  <Alert className="border-success/50 bg-success/10 text-success">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Changes detected. Saving will create version v
                      {prompt.version + 1}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </section>

            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                type="submit"
                className="gap-2"
                disabled={!hasChanges || isLoading || isSubmitting}
              >
                <Save className="h-4 w-4" />
                {isSubmitting || isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="min-w-0 space-y-4 lg:max-h-[680px] lg:overflow-y-auto lg:pr-2 scrollbar-slim">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Review & Compare
              </h3>
              <p className="text-sm text-muted-foreground">
                Inspect the live preview, see a diff, or reference the current
                version without leaving the editor.
              </p>
            </div>

            <Tabs
              value={reviewTab}
              onValueChange={(value) =>
                setReviewTab(value as "preview" | "diff" | "reference")
              }
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-3 bg-secondary/30 border border-border/40">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="diff">Diff</TabsTrigger>
                <TabsTrigger value="reference">Reference</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                <PromptPreview template={template} variables={variables} />
              </TabsContent>

              <TabsContent value="diff" className="space-y-4">
                <DiffViewer original={prompt.template} updated={template} />
              </TabsContent>

              <TabsContent value="reference" className="space-y-4">
                <div className="scrollbar-slim rounded-md bg-secondary/20 border border-border/50 p-4 max-h-[320px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words text-sm font-mono text-muted-foreground">
                    {prompt.template}
                  </pre>
                </div>
                {prompt.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Active Variables
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {prompt.variables.map((variable: string) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="bg-secondary/20 text-muted-foreground font-mono text-xs"
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </form>
  );
}
