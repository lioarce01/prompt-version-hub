"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Globe, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  useGetExperimentQuery,
  useGetExperimentStatsQuery,
  useDeleteExperimentMutation,
} from "@/features/experiments/experimentsApi";
import { VariantDistributionChart } from "@/components/experiments/VariantDistributionChart";
import { EditExperimentModal } from "@/components/experiments/EditExperimentModal";
import { cn } from "@/lib/utils";

export default function ExperimentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptName = decodeURIComponent(params.name as string);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: experiment, isLoading: isLoadingExperiment } =
    useGetExperimentQuery(promptName);

  // Use experiment name as experiment_name for stats (common pattern)
  const { data: stats, isLoading: isLoadingStats } =
    useGetExperimentStatsQuery(promptName);

  const [deleteExperiment, { isLoading: isDeleting }] =
    useDeleteExperimentMutation();

  const handleDelete = async () => {
    if (!experiment) return;

    try {
      await deleteExperiment({
        id: experiment.id,
        promptName: experiment.prompt_name
      }).unwrap();
      toast.success("Experiment deleted successfully");
      router.push("/experiments");
    } catch (error) {
      toast.error("Failed to delete experiment");
    }
  };

  if (isLoadingExperiment) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-lg border border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Experiment not found
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/experiments")}
            className="mt-4"
          >
            Back to Experiments
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = experiment.created_by !== null;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/experiments")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Experiments
          </Button>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {experiment.prompt_name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5",
                    experiment.is_public
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
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
                {isOwner && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                    Owner
                  </Badge>
                )}
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Variant Distribution
          </h2>
          {isLoadingStats ? (
            <Skeleton className="h-64" />
          ) : stats && stats.total_assignments > 0 ? (
            <VariantDistributionChart
              variants={stats.variants}
              totalAssignments={stats.total_assignments}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No assignments yet for this experiment
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Users will be assigned to variants as they interact with the
                system
              </p>
            </div>
          )}
        </div>

        {/* Weights Configuration */}
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Configured Weights
          </h2>
          <div className="space-y-3">
            {Object.entries(experiment.weights)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([version, weight]) => {
                const total = Object.values(experiment.weights).reduce(
                  (sum, w) => sum + w,
                  0
                );
                const percentage =
                  total > 0 ? Math.round((weight / total) * 100) : 0;

                return (
                  <div
                    key={version}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        Version {version}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Weight: {weight}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        {percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of traffic
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experiment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this experiment? This action
              cannot be undone and will remove all associated assignments.
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

      {/* Edit Modal */}
      {showEditModal && (
        <EditExperimentModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          experiment={experiment}
        />
      )}
    </>
  );
}
