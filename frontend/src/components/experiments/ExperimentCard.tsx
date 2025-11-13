"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, MoreVertical, Trash2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ABPolicyListItem } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteExperimentMutation } from "@/hooks/useExperiments";
import { cn } from "@/lib/utils";
import { abService } from "@/lib/services/ab.service";
import { useUserId } from "@/hooks/useAuth";

interface ExperimentCardProps {
  experiment: ABPolicyListItem;
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  const router = useRouter();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { mutateAsync: deleteExperiment, isPending: isDeleting } =
    useDeleteExperimentMutation();

  // Prefetch experiment details and stats on hover
  const handlePrefetchExperiment = () => {
    if (!userId) return;

    const promptName = experiment.prompt_name;

    // Prefetch experiment detail
    queryClient.prefetchQuery({
      queryKey: ["experiments", "detail", promptName],
      queryFn: async () => {
        return abService.getPolicyByName(promptName, userId);
      },
    });

    // Prefetch experiment stats
    queryClient.prefetchQuery({
      queryKey: ["experiments", "results", promptName],
      queryFn: async () => {
        return abService.getExperimentStats(promptName, userId);
      },
    });
  };

  const totalWeight = Object.values(experiment.weights).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const variantCount = Object.keys(experiment.weights).length;

  const handleDelete = async () => {
    try {
      await deleteExperiment(experiment.id);
      toast.success("Experiment deleted successfully");
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Failed to delete experiment");
    }
  };

  return (
    <>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all hover:shadow-md",
          "border-border bg-card/50 hover:bg-accent/5",
        )}
        onMouseEnter={handlePrefetchExperiment}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {experiment.prompt_name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(experiment.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>

            {experiment.is_owner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Visibility Badge */}
          <div className="mt-4">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                experiment.is_public
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/20",
              )}
            >
              {experiment.is_public ? (
                <>
                  <Globe className="h-3 w-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Private
                </>
              )}
            </Badge>
          </div>

          {/* Variants */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Variants ({variantCount})
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(experiment.weights)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([version, weight]) => {
                  const percentage =
                    totalWeight > 0
                      ? Math.round((weight / totalWeight) * 100)
                      : 0;
                  return (
                    <div
                      key={version}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2.5 py-1.5"
                    >
                      <span className="text-xs font-medium text-foreground">
                        v{version}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* View Stats Button */}
          <Button
            variant="outline"
            className="w-full mt-4 gap-2"
            size="sm"
            onClick={() => {
              router.push(
                `/experiments/${encodeURIComponent(experiment.prompt_name)}`,
              );
            }}
          >
            <Eye className="h-4 w-4" />
            View Statistics
          </Button>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experiment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the experiment "
              {experiment.prompt_name}"? This action cannot be undone and will
              remove all associated assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
