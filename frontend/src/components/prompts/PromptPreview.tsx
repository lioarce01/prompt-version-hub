"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";

interface PromptPreviewProps {
  template: string;
  variables: string[];
}

export function PromptPreview({ template, variables }: PromptPreviewProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Initialize values for all variables
  useEffect(() => {
    const newValues: Record<string, string> = {};
    variables.forEach((variable) => {
      if (values[variable] === undefined) {
        newValues[variable] = "";
      }
    });
    if (Object.keys(newValues).length > 0) {
      setValues((prev) => ({ ...prev, ...newValues }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variables]);

  // Render template with variable values
  const renderTemplate = () => {
    let result = template;
    variables.forEach((variable) => {
      const value = values[variable] || `{{${variable}}}`;
      result = result.replace(new RegExp(`\\{\\{${variable}\\}\\}`, "g"), value);
    });
    return result;
  };

  const rendered = renderTemplate();
  const missingVars = variables.filter((v) => !values[v]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rendered);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Variable Inputs */}
      {variables.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {variables.map((variable) => (
              <div key={variable} className="space-y-1.5">
                <Label htmlFor={variable} className="text-xs text-muted-foreground">
                  {variable}
                </Label>
                <Input
                  id={variable}
                  value={values[variable] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [variable]: e.target.value }))
                  }
                  placeholder={`Enter ${variable}...`}
                  className="bg-background/50 border-border/50"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview Output */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Preview</CardTitle>
          <div className="flex items-center gap-2">
            {missingVars.length > 0 && (
              <Badge variant="outline" className="text-xs border-warning/50 text-warning">
                {missingVars.length} missing
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="scrollbar-slim rounded-md bg-secondary/20 border border-border/50 p-4 min-h-[100px] max-h-[480px] overflow-y-auto">
            <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words">
              {rendered || "Template is empty"}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
