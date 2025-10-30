"use client";

import { useState, useEffect, useRef } from "react";
import { useGetPromptsQuery, useGetVersionsQuery } from "@/features/prompts/promptsApi";
import { useDeployMutation } from "@/features/deployments/deploymentsApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Environment } from "@/types/deployments";

interface DeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEnvironment?: Environment;
  defaultPromptName?: string;
  defaultVersion?: number;
}

export function DeployModal({
  open,
  onOpenChange,
  defaultEnvironment,
  defaultPromptName,
  defaultVersion,
}: DeployModalProps) {
  const [selectedPromptName, setSelectedPromptName] = useState<string>(defaultPromptName || "");
  const [selectedVersion, setSelectedVersion] = useState<string>(defaultVersion?.toString() || "");
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>(defaultEnvironment || "dev");
  const isDeployingRef = useRef(false);

  const { data: promptsData, isLoading: promptsLoading } = useGetPromptsQuery({
    latest_only: true,
    limit: 100,
  });

  const { data: versionsData, isLoading: versionsLoading } = useGetVersionsQuery(
    selectedPromptName,
    { skip: !selectedPromptName }
  );

  const [deploy, { isLoading: isDeploying }] = useDeployMutation();

  // Reset form when modal opens with defaults
  useEffect(() => {
    if (open) {
      setSelectedPromptName(defaultPromptName || "");
      setSelectedVersion(defaultVersion?.toString() || "");
      setSelectedEnvironment(defaultEnvironment || "dev");
    }
  }, [open, defaultPromptName, defaultVersion, defaultEnvironment]);

  // Auto-select version if only one prompt is selected
  useEffect(() => {
    if (versionsData?.items && versionsData.items.length > 0 && !selectedVersion) {
      // Select the active version by default
      const activeVersion = versionsData.items.find((v) => v.active);
      if (activeVersion) {
        setSelectedVersion(activeVersion.version.toString());
      }
    }
  }, [versionsData, selectedVersion]);

  const handleDeploy = async () => {
    if (!selectedPromptName || !selectedVersion || !selectedEnvironment) {
      toast.error("Please select all fields");
      return;
    }

    // Prevent double calls from React Strict Mode
    if (isDeployingRef.current) {
      return;
    }

    isDeployingRef.current = true;

    try {
      const result = await deploy({
        prompt_name: selectedPromptName,
        version: parseInt(selectedVersion, 10),
        environment: selectedEnvironment,
      }).unwrap();

      // Close modal first to prevent double renders
      onOpenChange(false);

      // Show success toast after closing to avoid duplicate in Strict Mode
      toast.success(
        `Successfully deployed ${selectedPromptName} v${selectedVersion} to ${selectedEnvironment}`
      );
    } catch (error: any) {
      const message = error?.data?.detail || "Failed to deploy. Please try again.";
      toast.error(message);
    } finally {
      // Reset flag after a small delay
      setTimeout(() => {
        isDeployingRef.current = false;
      }, 1000);
    }
  };

  const canDeploy = selectedPromptName && selectedVersion && selectedEnvironment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Deploy Prompt
          </DialogTitle>
          <DialogDescription>
            Select a prompt, version, and environment to deploy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prompt Selection */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Select
              value={selectedPromptName}
              onValueChange={(value) => {
                setSelectedPromptName(value);
                setSelectedVersion(""); // Reset version when prompt changes
              }}
              disabled={promptsLoading || isDeploying}
            >
              <SelectTrigger id="prompt">
                <SelectValue placeholder="Select a prompt" />
              </SelectTrigger>
              <SelectContent>
                {promptsData?.items.map((prompt) => (
                  <SelectItem key={prompt.name} value={prompt.name}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version Selection */}
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Select
              value={selectedVersion}
              onValueChange={setSelectedVersion}
              disabled={!selectedPromptName || versionsLoading || isDeploying}
            >
              <SelectTrigger id="version">
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent>
                {versionsData?.items.map((version) => (
                  <SelectItem key={version.version} value={version.version.toString()}>
                    <div className="flex items-center gap-2">
                      <span>Version {version.version}</span>
                      {version.active && (
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Environment Selection */}
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select
              value={selectedEnvironment}
              onValueChange={(value) => setSelectedEnvironment(value as Environment)}
              disabled={isDeploying}
            >
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">🔧 Development</SelectItem>
                <SelectItem value="staging">🎯 Staging</SelectItem>
                <SelectItem value="production">🚀 Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confirmation Summary */}
          {canDeploy && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Deploy <strong>{selectedPromptName}</strong> version{" "}
                <strong>{selectedVersion}</strong> to{" "}
                <strong>{selectedEnvironment}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Production Warning */}
          {selectedEnvironment === "production" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are deploying to production. Make sure this version has been tested.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button onClick={handleDeploy} disabled={!canDeploy || isDeploying}>
            {isDeploying ? (
              "Deploying..."
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Deploy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
