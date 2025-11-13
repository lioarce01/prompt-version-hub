"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useGetMyPromptsQuery,
  useUpdateVisibilityMutation,
  useDeletePromptMutation,
} from "@/hooks/usePrompts";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Rocket,
  Eye,
  EyeOff,
  Search,
  GitBranch,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Prompt } from "@/types/prompts";

const PAGE_SIZE = 12;
const SKELETON_ITEMS = Array.from({ length: 4 }, (_, index) => index);

export default function MyPromptsPage() {
  const { canEdit, canDelete } = useRole();
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "public" | "private"
  >("all");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [sortBy, setSortBy] = useState<"created_at" | "name">("created_at");
  const [offset, setOffset] = useState(0);

  const queryParams = useMemo(() => {
    const activeParam =
      activeFilter === "active"
        ? true
        : activeFilter === "inactive"
          ? false
          : undefined;

    return {
      q: search || undefined,
      active: activeParam,
      sort_by: sortBy,
      order: "desc" as const,
      limit: PAGE_SIZE,
      offset,
      visibility: visibilityFilter === "all" ? undefined : visibilityFilter,
    };
  }, [activeFilter, offset, search, sortBy, visibilityFilter]);

  const { data, isLoading, isFetching, error } =
    useGetMyPromptsQuery(queryParams);
  const { mutateAsync: updateVisibility, isPending: isUpdatingVisibility } =
    useUpdateVisibilityMutation();
  const { mutateAsync: deletePrompt, isPending: isDeleting } = useDeletePromptMutation();

  const prompts = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const pageSize = data?.limit ?? PAGE_SIZE;
  const hasNext = data?.has_next ?? false;
  const hasPrevious = offset > 0;
  const startItem = totalCount > 0 ? offset + 1 : 0;
  const endItem = totalCount > 0 ? offset + prompts.length : 0;

  const handleToggleVisibility = async (prompt: Prompt) => {
    try {
      await updateVisibility({
        name: prompt.name,
        data: { is_public: !prompt.is_public },
      });
      toast.success(
        `Prompt "${prompt.name}" is now ${prompt.is_public ? "private" : "public"}.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update visibility");
    }
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!canDelete) return;
    try {
      await deletePrompt(prompt.name);
      toast.success(`Prompt "${prompt.name}" deleted`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete prompt");
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load your prompts.</p>
      </div>
    );
  }

  const showEmpty = !isLoading && !isFetching && prompts.length === 0;

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your private workspace and share prompts with your team.
          </p>
        </div>
        <Link href="/prompts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Prompt
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_250px]">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search my prompts..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              className="pl-10 h-12"
            />
          </div>
          <Alert className="border-primary/40 bg-primary/5">
            <AlertDescription className="text-xs">
              Toggle any prompt public to surface it in the shared hub
              instantly.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="font-medium">Visibility:</span>
            <div className="flex rounded-lg border border-border/40 bg-background/50 p-1 gap-1">
              {(["all", "public", "private"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={visibilityFilter === option ? "secondary" : "ghost"}
                  onClick={() => {
                    setVisibilityFilter(option);
                    setOffset(0);
                  }}
                  className="capitalize"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium">Status:</span>
            <div className="flex rounded-lg border border-border/40 bg-background/50 p-1 gap-1">
              {(["all", "active", "inactive"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={activeFilter === option ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveFilter(option);
                    setOffset(0);
                  }}
                  className="capitalize"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium">Sort:</span>
            <div className="flex rounded-lg border border-border/40 bg-background/50 p-1 gap-1">
              {(["created_at", "name"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={sortBy === option ? "secondary" : "ghost"}
                  onClick={() => {
                    setSortBy(option);
                    setOffset(0);
                  }}
                  className="capitalize"
                >
                  {option === "created_at" ? "Recent" : "Name"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(isLoading || isFetching) && (
        <div className="grid gap-4 md:grid-cols-2">
          {SKELETON_ITEMS.map((item) => (
            <Skeleton
              key={`my-prompts-skeleton-${item}`}
              className="h-44 w-full bg-secondary/20"
            />
          ))}
        </div>
      )}

      {showEmpty ? (
        <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "No prompts match your search in this workspace."
              : "Create a new prompt to start your library."}
          </p>
          <Button asChild>
            <Link href="/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Prompt
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {prompts.map((prompt: any) => (
              <Card
                key={prompt.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    {prompt.name}
                    <Badge
                      variant="outline"
                      className={
                        prompt.is_public
                          ? "border-accent/40 text-muted-foreground"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }
                    >
                      {prompt.is_public ? "Public" : "Private"}
                    </Badge>
                    {prompt.active && (
                      <Badge
                        variant="secondary"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5" />v{prompt.version}
                    </span>
                    <span className="text-muted-foreground">
                      Updated{" "}
                      {formatDistanceToNow(new Date(prompt.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <span className="text-muted-foreground">
                      {prompt.variables.length} variable
                      {prompt.variables.length !== 1 ? "s" : ""}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-border/50 bg-background/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Template preview
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 font-mono">
                      {prompt.template}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      asChild
                    >
                      <Link href={`/prompts/${prompt.name}?edit=true`}>
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      asChild
                    >
                      <Link
                        href={`/deployments?prompt=${encodeURIComponent(prompt.name)}`}
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Deploy
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleToggleVisibility(prompt)}
                      disabled={isUpdatingVisibility}
                    >
                      {prompt.is_public ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Make Private
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Make Public
                        </>
                      )}
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive/90"
                        onClick={() => handleDelete(prompt)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!showEmpty && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {totalCount} prompt
            {totalCount !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setOffset((prev) => Math.max(0, prev - pageSize))}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setOffset((prev) => prev + pageSize)}
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
