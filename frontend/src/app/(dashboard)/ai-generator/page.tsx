"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  Wand2,
  Target,
  Users,
  FileText,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useGeneratePromptMutation } from "@/features/ai/aiApi";
import { useCreatePromptMutation } from "@/features/prompts/promptsApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type {
  PromptGenerationRequestPayload,
  PromptGenerationResponse,
  ToneOption,
  OutputFormatOption,
} from "@/types/ai";

type FormState = {
  goal: string;
  industry: string;
  targetAudience: string;
  tone: ToneOption;
  outputFormat: OutputFormatOption;
  context: string;
  constraints: string;
  examples: string;
};

const createInitialFormState = (): FormState => ({
  goal: "",
  industry: "",
  targetAudience: "",
  tone: "professional",
  outputFormat: "text",
  context: "",
  constraints: "",
  examples: "",
});

const buildPromptName = (goal: string) => {
  const sanitized = goal
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  return sanitized || `generated-prompt`;
};

export default function AIGeneratorPage() {
  const router = useRouter();
  const [generatePrompt, { isLoading: isGenerating }] = useGeneratePromptMutation();
  const [createPrompt, { isLoading: isPublishing }] = useCreatePromptMutation();
  const [generationResult, setGenerationResult] = useState<PromptGenerationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormState>(() => createInitialFormState());

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    // Validate required fields
    if (!formData.goal.trim()) {
      toast.error("Please describe your prompt goal");
      return;
    }
    if (formData.goal.trim().length < 10) {
      toast.error("Prompt goal should be at least 10 characters long.");
      return;
    }

    const payload: PromptGenerationRequestPayload = {
      goal: formData.goal.trim(),
      industry: formData.industry.trim() || undefined,
      target_audience: formData.targetAudience.trim() || undefined,
      tone: formData.tone,
      output_format: formData.outputFormat,
      context: formData.context.trim() || undefined,
      constraints: formData.constraints.trim() || undefined,
      examples: formData.examples.trim() || undefined,
    };

    try {
      const result = await generatePrompt(payload).unwrap();
      setGenerationResult(result);
      setCopied(false);
      toast.success("Prompt generated successfully!");
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleCopy = () => {
    if (generationResult?.prompt_template) {
      navigator.clipboard.writeText(generationResult.prompt_template);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (generationResult?.prompt_template) {
      const blob = new Blob([generationResult.prompt_template], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-prompt-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Prompt downloaded successfully");
    }
  };

  const handleReset = () => {
    setFormData(createInitialFormState());
    setGenerationResult(null);
    setCopied(false);
  };

  const handleOpenPublishDialog = () => {
    if (!generationResult) {
      return;
    }
    setPromptName(buildPromptName(formData.goal));
    setPublishError(null);
    setIsPublishDialogOpen(true);
  };

  const handlePublishPrompt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!generationResult) {
      return;
    }

    const name = promptName.trim();
    if (!name) {
      setPublishError("Name is required");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setPublishError("Use letters, numbers, hyphens, or underscores");
      return;
    }

    setPublishError(null);

    try {
      const created = await createPrompt({
        name,
        template: generationResult.prompt_template,
        variables: generationResult.variables,
      }).unwrap();

      toast.success(`Prompt "${created.name}" published to your library`);
      setIsPublishDialogOpen(false);
      router.push(`/prompts/${created.name}`);
    } catch (error) {
      const message = extractErrorMessage(error);
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes("exists") || normalizedMessage.includes("duplicate")) {
        setPublishError("A prompt with this name already exists");
      } else {
        setPublishError(message);
      }
      toast.error(message);
    }
  };

  const promptText = generationResult?.prompt_template ?? "";
  const metadata = generationResult?.metadata;
  const variables = generationResult?.variables ?? [];
  const suggestions = generationResult?.suggestions ?? [];

  return (
    <>
      <div className="space-y-6 max-w-[1400px]">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">AI Prompt Generator</h1>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            Beta
          </Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Generate professional, optimized prompts with AI assistance
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary flex-shrink-0" />
          <AlertDescription className="text-sm">
            Describe your use case and let AI create a production-ready prompt template with
            variables, best practices, and optimizations.
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Prompt Configuration
            </CardTitle>
            <CardDescription>
              Fill in the details to generate your custom prompt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Goal */}
            <div className="space-y-2">
              <Label htmlFor="goal" className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Prompt Goal *
              </Label>
              <Textarea
                id="goal"
                placeholder="E.g., Generate product descriptions for e-commerce, Create email responses for customer support, Summarize technical documentation..."
                value={formData.goal}
                onChange={(e) => handleInputChange("goal", e.target.value)}
                className="min-h-[80px] bg-background/50"
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">Industry / Domain</Label>
              <Input
                id="industry"
                placeholder="E.g., Healthcare, E-commerce, Finance, Education..."
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                className="bg-background/50"
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Target Audience
              </Label>
              <Input
                id="targetAudience"
                placeholder="E.g., Developers, Marketing teams, End customers..."
                value={formData.targetAudience}
                onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                className="bg-background/50"
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">Tone / Style</Label>
              <Select value={formData.tone} onValueChange={(value) => handleInputChange("tone", value)}>
                <SelectTrigger id="tone" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <Label htmlFor="outputFormat" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Expected Output Format
              </Label>
              <Select
                value={formData.outputFormat}
                onValueChange={(value) => handleInputChange("outputFormat", value)}
              >
                <SelectTrigger id="outputFormat" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="list">Bullet List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Context */}
            <div className="space-y-2">
              <Label htmlFor="context">Additional Context</Label>
              <Textarea
                id="context"
                placeholder="Any additional context, background information, or specific requirements..."
                value={formData.context}
                onChange={(e) => handleInputChange("context", e.target.value)}
                className="min-h-[60px] bg-background/50"
              />
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <Label htmlFor="constraints">Constraints / Limitations</Label>
              <Textarea
                id="constraints"
                placeholder="E.g., Max 200 words, Must avoid jargon, Should include specific keywords..."
                value={formData.constraints}
                onChange={(e) => handleInputChange("constraints", e.target.value)}
                className="min-h-[60px] bg-background/50"
              />
            </div>

            {/* Examples */}
            <div className="space-y-2">
              <Label htmlFor="examples">Example Inputs/Outputs (Optional)</Label>
              <Textarea
                id="examples"
                placeholder="Provide examples of inputs and expected outputs to guide the AI..."
                value={formData.examples}
                onChange={(e) => handleInputChange("examples", e.target.value)}
                className="min-h-[80px] bg-background/50"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.goal.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Prompt
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Preview */}
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generated Prompt
            </CardTitle>
            <CardDescription>
              Your AI-optimized prompt template ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-lg bg-background/30">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">
                  Generating a fresh prompt tailored to your inputs...
                </p>
              </div>
            ) : !generationResult ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/60 rounded-lg bg-background/30">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Fill in the form and click "Generate Prompt" to see your AI-optimized template
                </p>
              </div>
            ) : (
              <>
                {/* Generated Prompt Display */}
                <div className="relative">
                  <div className="scrollbar-slim rounded-lg border border-border/60 bg-background/50 p-4 max-h-[500px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                      {promptText}
                    </pre>
                  </div>

                  {/* Success Badge */}
                  <div className="flex items-center gap-2 mt-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Prompt generated successfully
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-background/30 border border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground">Variables Detected</p>
                    <p className="text-sm font-medium text-foreground">
                      {variables.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Character Count</p>
                    <p className="text-sm font-medium text-foreground">
                      {metadata?.char_count ?? promptText.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Word Count</p>
                    <p className="text-sm font-medium text-foreground">
                      {metadata?.word_count ??
                        (promptText ? promptText.trim().split(/\s+/).length : 0)}
                    </p>
                  </div>
                </div>

                {metadata && (
                  <div className="grid gap-2 rounded-lg border border-border/40 bg-background/30 p-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Lines</span>
                      <span className="text-foreground font-medium">{metadata.line_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Complexity</span>
                      <span className="capitalize text-foreground font-medium">
                        {metadata.complexity}
                      </span>
                    </div>
                  </div>
                )}

                {variables.length > 0 && (
                  <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                    <p className="text-xs text-muted-foreground mb-2">Variables</p>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Improvement Suggestions</p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {suggestions.map((item, index) => (
                        <li key={`${item}-${index}`} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleOpenPublishDialog}
                    disabled={isPublishing}
                    className="sm:flex-1"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Publish to Library
                      </>
                    )}
                  </Button>
                  <Button onClick={handleCopy} variant="outline" className="sm:flex-1">
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button onClick={handleDownload} variant="outline" className="sm:flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download .txt
                  </Button>
                </div>

                {/* Info Alert */}
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs">
                    You can now copy this prompt or save it to your Prompts library for version
                    control and deployment.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>

      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Prompt to Library</DialogTitle>
            <DialogDescription>
              Save the generated template so you can iterate on versions and deploy it later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishPrompt} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publish-name">Prompt Name</Label>
              <Input
                id="publish-name"
                value={promptName}
                onChange={(event) => {
                  setPromptName(event.target.value);
                  if (publishError) {
                    setPublishError(null);
                  }
                }}
                autoFocus
                placeholder="stripe-subscription-guide"
              />
              {publishError && (
                <p className="text-xs text-destructive">{publishError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use letters, numbers, hyphens, or underscores.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    const detail = err?.data?.detail ?? err?.error ?? err?.statusText;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item: any) => {
          if (typeof item === "string") {
            return item;
          }
          if (item?.msg) {
            return String(item.msg);
          }
          return JSON.stringify(item);
        })
        .join(", ");
    }
    if (typeof detail === "object" && detail !== null) {
      if (detail.msg) {
        return String(detail.msg);
      }
      return JSON.stringify(detail);
    }
    if (typeof detail === "string") {
      return detail;
    }
  }
  return "Failed to generate prompt. Please try again.";
};
