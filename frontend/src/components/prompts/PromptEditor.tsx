"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import type { Prompt } from "@/types/prompts";
import { useUpdatePromptMutation } from "@/features/prompts/promptsApi";
import { PromptPreview } from "./PromptPreview";
import { DiffViewer } from "./DiffViewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [updatePrompt, { isLoading }] = useUpdatePromptMutation();

  const [template, setTemplate] = useState(prompt.template);
  const [variables, setVariables] = useState<string[]>(prompt.variables);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      validationErrors.template = "Template must be different from current version";
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
      }).unwrap();

      toast.success(
        `Prompt updated successfully. New version v${updatedPrompt.version} created.`,
      );
      setTemplate(updatedPrompt.template);
      setVariables(updatedPrompt.variables);
      onSuccess?.(updatedPrompt);
    } catch (error: any) {
      const message =
        error?.data?.detail || "Failed to update prompt. Please try again.";
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
            Each edit creates a new version. Version v{prompt.version} remains accessible in the history.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Template Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <p className="text-xs text-destructive">{errors.template}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {`{{variable}}`} syntax for dynamic values.
                  </p>
                </div>

                {variables.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Detected Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
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
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
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

          <div className="min-w-0 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Live Preview
              </h3>
              <PromptPreview template={template} variables={variables} />
            </div>

            <DiffViewer original={prompt.template} updated={template} />

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Current Version Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-secondary/20 border border-border/50 p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm font-mono text-muted-foreground">
                    {prompt.template}
                  </pre>
                </div>
                {prompt.variables.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Variables
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {prompt.variables.map((variable) => (
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </form>
  );
}
