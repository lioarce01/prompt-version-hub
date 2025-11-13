"use client";

import { useState } from "react";
import { Plus, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateExperimentMutation } from "@/hooks/useExperiments";

interface CreateExperimentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Variant {
  version: string;
  weight: string;
}

export function CreateExperimentModal({
  open,
  onOpenChange,
}: CreateExperimentModalProps) {
  const [promptName, setPromptName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([
    { version: "1", weight: "50" },
    { version: "2", weight: "50" },
  ]);

  const { mutateAsync: createExperiment, isPending: isLoading } = useCreateExperimentMutation();

  const handleAddVariant = () => {
    const nextVersion = String(variants.length + 1);
    setVariants([...variants, { version: nextVersion, weight: "0" }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 2) {
      toast.error("Minimum 2 variants required");
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (
    index: number,
    field: "version" | "weight",
    value: string,
  ) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!promptName.trim()) {
      toast.error("Prompt name is required");
      return;
    }

    if (variants.length < 2) {
      toast.error("At least 2 variants are required");
      return;
    }

    const weights: Record<string, number> = {};
    for (const variant of variants) {
      const version = variant.version.trim();
      const weight = Number(variant.weight);

      if (!version) {
        toast.error("All variant versions are required");
        return;
      }

      if (isNaN(weight) || weight < 0) {
        toast.error("All weights must be positive numbers");
        return;
      }

      if (weights[version] !== undefined) {
        toast.error(`Duplicate version: ${version}`);
        return;
      }

      if (weight > 0) {
        weights[version] = weight;
      }
    }

    if (Object.keys(weights).length < 2) {
      toast.error("At least 2 variants must have weight > 0");
      return;
    }

    try {
      await createExperiment({
        prompt_name: promptName.trim(),
        weights,
        is_public: isPublic,
      });

      toast.success("Experiment created successfully");
      handleClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create experiment");
    }
  };

  const handleClose = () => {
    setPromptName("");
    setIsPublic(false);
    setVariants([
      { version: "1", weight: "50" },
      { version: "2", weight: "50" },
    ]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Experiment</DialogTitle>
          <DialogDescription>
            Set up A/B testing with weighted variant distribution
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Prompt Name */}
          <div className="space-y-2">
            <Label htmlFor="prompt-name">Prompt Name</Label>
            <Input
              id="prompt-name"
              placeholder="e.g., welcome_message"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The name of the prompt to run A/B testing on
            </p>
          </div>

          {/* Variants */}
          <div className="space-y-3">
            <Label>Variant Weights</Label>
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Version"
                      value={variant.version}
                      onChange={(e) =>
                        handleVariantChange(index, "version", e.target.value)
                      }
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Weight"
                      value={variant.weight}
                      onChange={(e) =>
                        handleVariantChange(index, "weight", e.target.value)
                      }
                      min="0"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveVariant(index)}
                    disabled={variants.length <= 2}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddVariant}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </Button>

            <p className="text-xs text-muted-foreground">
              Weights determine the distribution. Example: 50/50 for equal split
            </p>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Make Public
                </p>
                <p className="text-xs text-muted-foreground">
                  Allow other users to use this experiment
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={isPublic ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? "Public" : "Private"}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Experiment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
