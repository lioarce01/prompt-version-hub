"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useGetPromptsQuery,
  useDeletePromptMutation,
  useClonePromptMutation,
} from "@/hooks/usePrompts";
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
import {
  Plus,
  Search,
  Grid3x3,
  List,
  Filter,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
} from "lucide-react";
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
import type { Prompt } from "@/types/prompts";

type ViewMode = "grid" | "table";
type HubVisibility = "all" | "my-public" | "my-private";
type ActiveFilter = "all" | "active" | "inactive";
type SortOption = "created_at" | "name";

const PAGE_SIZE = 20;
const HUB_SKELETON_ITEMS = Array.from({ length: 6 }, (_, index) => index);

const visibilityConfig: Record<
  HubVisibility,
  { visibility?: "all" | "public" | "private" | "owned"; owned?: boolean }
> = {
  all: { visibility: "public" },
  "my-public": { visibility: "public", owned: true },
  "my-private": { visibility: "private", owned: true },
};

export default function PromptsPage() {
  const { canEdit } = useRole();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [offset, setOffset] = useState<number>(0);
  const [deletePromptName, setDeletePromptName] = useState<string | null>(null);
  const [hubVisibility, setHubVisibility] = useState<HubVisibility>("all");

  const queryParams = useMemo(() => {
    const activeParam =
      activeFilter === "active"
        ? true
        : activeFilter === "inactive"
          ? false
          : undefined;

    const { visibility, owned } = visibilityConfig[hubVisibility];

    return {
      q: searchQuery || undefined,
      active: activeParam,
      sort_by: sortBy,
      order: "desc" as const,
      limit: PAGE_SIZE,
      offset,
      visibility,
      owned,
    };
  }, [activeFilter, hubVisibility, offset, searchQuery, sortBy]);

  const { data, isLoading, isFetching, error } =
    useGetPromptsQuery(queryParams);
  const { mutateAsync: deletePrompt, isPending: isDeleting } = useDeletePromptMutation();
  const { mutateAsync: clonePrompt, isPending: isCloning } = useClonePromptMutation();

  const handleDelete = async () => {
    if (!deletePromptName) return;

    try {
      await deletePrompt(deletePromptName);
      toast.success(`Prompt "${deletePromptName}" deleted successfully`);
      setDeletePromptName(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete prompt");
    }
  };

  const handleClone = async (prompt: Prompt) => {
    if (isCloning) {
      return;
    }
    try {
      await clonePrompt({ name: prompt.name });
      toast.success(`Prompt "${prompt.name}" cloned to your workspace`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to clone prompt");
    }
  };

  const pageSize = data?.limit ?? PAGE_SIZE;
  const totalCount = data?.count ?? 0;
  const hasNext = data?.has_next ?? false;
  const hasPrevious = offset > 0;
  const itemsOnPage = data?.items.length ?? 0;
  const currentPage = totalCount > 0 ? Math.floor(offset / pageSize) + 1 : 0;
  const totalPages =
    totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 0;
  const startItem = totalCount > 0 ? offset + 1 : 0;
  const endItem = totalCount > 0 ? offset + itemsOnPage : 0;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prompts</h1>
          <p className="text-muted-foreground mt-1">
            Discover community prompts or manage your own workspace.
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" asChild>
            <Link href="/prompts/new">
              <Plus className="h-4 w-4" />
              New Prompt
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Prompt Hub
            </h2>
            <p className="text-sm text-muted-foreground">
              Browse public prompts or filter the ones you have shared with the
              community.
            </p>
          </div>
          <div className="flex gap-2 rounded-lg border border-border/40 bg-background/50 p-1 text-sm">
            <Button
              variant={hubVisibility === "all" ? "secondary" : "ghost"}
              size="sm"
              className={
                hubVisibility === "all"
                  ? "gap-2"
                  : "gap-2 text-muted-foreground hover:text-foreground"
              }
              onClick={() => {
                setHubVisibility("all");
                setOffset(0);
              }}
            >
              <Globe className="h-3.5 w-3.5" />
              All Public
            </Button>
            <Button
              variant={hubVisibility === "my-public" ? "secondary" : "ghost"}
              size="sm"
              className={
                hubVisibility === "my-public"
                  ? "gap-2"
                  : "gap-2 text-muted-foreground hover:text-foreground"
              }
              onClick={() => {
                setHubVisibility("my-public");
                setOffset(0);
              }}
            >
              <Badge
                variant={
                  hubVisibility === "my-public" ? "secondary" : "outline"
                }
                className={
                  hubVisibility === "my-public"
                    ? "h-5 px-2 shrink-0 rounded-full uppercase"
                    : "h-5 px-2 shrink-0 rounded-full uppercase text-muted-foreground border-border/50"
                }
              >
                Me
              </Badge>
              My Public
            </Button>
            <Button
              variant={hubVisibility === "my-private" ? "secondary" : "ghost"}
              size="sm"
              className={
                hubVisibility === "my-private"
                  ? "gap-2"
                  : "gap-2 text-muted-foreground hover:text-foreground"
              }
              onClick={() => {
                setHubVisibility("my-private");
                setOffset(0);
              }}
            >
              <Lock className="h-3.5 w-3.5" />
              My Private
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOffset(0);
              }}
              className="pl-9 bg-background/50 backdrop-blur-sm border-border/50 text-white placeholder:text-white/50"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:justify-start">
            <Select
              value={activeFilter}
              onValueChange={(value) => {
                setActiveFilter(value as ActiveFilter);
                setOffset(0);
              }}
            >
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

            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as SortOption);
                setOffset(0);
              }}
            >
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
                className={
                  viewMode === "grid"
                    ? "bg-secondary"
                    : "bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-secondary/50 text-white/70 hover:text-white"
                }
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("table")}
                className={
                  viewMode === "table"
                    ? "bg-secondary"
                    : "bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-secondary/50 text-white/70 hover:text-white"
                }
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {(isLoading || isFetching) && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          {HUB_SKELETON_ITEMS.map((item) => (
            <Skeleton
              key={`prompts-skeleton-${item}`}
              className="h-40 w-full bg-secondary/20"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Failed to load prompts</p>
        </div>
      )}

      {!isLoading &&
        !isFetching &&
        !error &&
        (data?.items.length ?? 0) === 0 && (
          <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              No prompts yet
            </h3>
            <p className="text-foreground/70 mb-4">
              {searchQuery
                ? "No prompts match your search."
                : "Get started by creating your first prompt."}
            </p>
            {canEdit && !searchQuery && (
              <Button asChild>
                <Link href="/prompts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Prompt
                </Link>
              </Button>
            )}
          </div>
        )}

      {!isLoading && !isFetching && !error && data && data.items.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((prompt: any) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onDelete={(name) => setDeletePromptName(name)}
                  onClone={handleClone}
                />
              ))}
            </div>
          ) : (
            <PromptTable
              prompts={data.items}
              onDelete={(name) => setDeletePromptName(name)}
              onClone={handleClone}
            />
          )}
        </>
      )}

      {!isLoading && !error && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {totalPages > 1 ? (
            <div className="text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <span className="mx-2 text-muted-foreground/60">|</span>
              <span>
                {startItem}-{endItem} of {totalCount} prompts
              </span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {totalCount} prompt{totalCount !== 1 ? "s" : ""} total
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setOffset((prev) => Math.max(0, prev - pageSize))}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setOffset((prev) => prev + pageSize)}
              disabled={!hasNext}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deletePromptName}
        onOpenChange={() => setDeletePromptName(null)}
      >
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
