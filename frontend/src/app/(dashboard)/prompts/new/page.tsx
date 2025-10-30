"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreatePromptMutation } from "@/features/prompts/promptsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromptPreview } from "@/components/prompts/PromptPreview";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewPromptPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createPrompt, { isLoading }] = useCreatePromptMutation();

  // Auto-detect variables from template
  useEffect(() => {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      const extractedVars = Array.from(
        new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))
      );
      setVariables(extractedVars);
    } else {
      setVariables([]);
    }
  }, [template]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      newErrors.name = "Name can only contain letters, numbers, hyphens, and underscores";
    }

    if (!template.trim()) {
      newErrors.template = "Template is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const result = await createPrompt({
        name: name.trim(),
        template: template.trim(),
        variables,
      }).unwrap();

      toast.success(`Prompt "${result.name}" created successfully`);
      router.push(`/prompts/${result.name}`);
    } catch (err: any) {
      const message = err?.data?.detail || "Failed to create prompt";
      toast.error(message);

      // Handle duplicate name error
      if (message.includes("already exists") || message.includes("unique")) {
        setErrors({ name: "A prompt with this name already exists" });
      }
    }
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/prompts">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-foreground hover:text-foreground/80"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Prompt</h1>
          <p className="text-muted-foreground mt-1">
            Create a new prompt template with variables
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Prompt Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) {
                        setErrors({ ...errors, name: "" });
                      }
                    }}
                    placeholder="welcome-prompt"
                    className={`bg-background/50 border-border/50 ${
                      errors.name ? "border-destructive" : ""
                    }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use lowercase letters, numbers, hyphens, and underscores
                  </p>
                </div>

                {/* Template */}
                <div className="space-y-2">
                  <Label htmlFor="template">
                    Template <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="template"
                    value={template}
                    onChange={(e) => {
                      setTemplate(e.target.value);
                      if (errors.template) {
                        setErrors({ ...errors, template: "" });
                      }
                    }}
                    placeholder="Hello {{name}}, welcome to {{app_name}}!"
                    rows={10}
                    className={`bg-background/50 border-border/50 font-mono text-sm ${
                      errors.template ? "border-destructive" : ""
                    }`}
                  />
                  {errors.template && (
                    <p className="text-xs text-destructive">{errors.template}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {`{{variable}}`} syntax for dynamic values
                  </p>
                </div>

                {/* Auto-detected Variables */}
                {variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Detected Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Badge
                          key={variable}
                          variant="secondary"
                          className="bg-secondary/50 text-foreground"
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {template && variables.length === 0 && (
                  <Alert className="border-warning/50 bg-warning/10">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      No variables detected. Use {`{{variable}}`} syntax to add
                      dynamic values.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? "Creating..." : "Create Prompt"}
              </Button>
              <Link href="/prompts">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Live Preview</h3>
            <PromptPreview template={template} variables={variables} />
          </div>
        </div>
      </form>
    </div>
  );
}
