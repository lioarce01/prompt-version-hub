"use client";

import { useState } from "react";
import Link from "next/link";
import { useGetPromptsQuery, useDeletePromptMutation } from "@/features/prompts/promptsApi";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PromptCard } from "@/components/prompts/PromptCard";
import { PromptTable } from "@/components/prompts/PromptTable";
import { Plus, Search, Grid3x3, List, Filter } from "lucide-react";
import { toast } from "sonner";
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

type ViewMode = "grid" | "table";

export default function PromptsPage() {
  const { canEdit } = useRole();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [deletePromptName, setDeletePromptName] = useState<string | null>(null);

  const { data, isLoading, error } = useGetPromptsQuery({
    q: searchQuery || undefined,
    active: activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
    sort_by: sortBy,
    order: "desc",
    limit: 50,
  });

  const [deletePrompt, { isLoading: isDeleting }] = useDeletePromptMutation();

  const handleDelete = async () => {
    if (!deletePromptName) return;

    try {
      await deletePrompt(deletePromptName).unwrap();
      toast.success(`Prompt "${deletePromptName}" deleted successfully`);
      setDeletePromptName(null);
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to delete prompt");
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prompts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI prompt templates
          </p>
        </div>
        {canEdit && (
          <Link href="/prompts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Prompt
            </Button>
          </Link>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 backdrop-blur-sm border-border/50 text-white placeholder:text-white/50"
          />
        </div>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border/50 text-white">
            <Filter className="h-4 w-4 mr-2 text-white/70" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prompts</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border/50 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Recent First</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-secondary" : "bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-secondary/50 text-white/70 hover:text-white"}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-secondary" : "bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-secondary/50 text-white/70 hover:text-white"}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Badge */}
      {data && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-secondary/50">
            {data.items.length} prompt{data.items.length !== 1 ? "s" : ""}
          </Badge>
          {data.has_next && (
            <Badge variant="outline" className="border-border/50">
              More available
            </Badge>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full bg-secondary/20" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Failed to load prompts</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data?.items.length === 0 && (
        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "No prompts match your search"
              : "Get started by creating your first prompt"}
          </p>
          {canEdit && !searchQuery && (
            <Link href="/prompts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Prompt
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Prompts List */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onDelete={(name) => setDeletePromptName(name)}
                />
              ))}
            </div>
          ) : (
            <PromptTable
              prompts={data.items}
              onDelete={(name) => setDeletePromptName(name)}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePromptName} onOpenChange={() => setDeletePromptName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletePromptName}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
    </div>
  );
}
