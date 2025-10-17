"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Eye, GitBranch } from "lucide-react";
import type { Prompt } from "@/types/prompts";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

interface PromptCardProps {
  prompt: Prompt;
  onDelete?: (name: string) => void;
}

export function PromptCard({ prompt, onDelete }: PromptCardProps) {
  const { canEdit, canDelete } = useRole();

  return (
    <Card className="group hover:border-accent/50 transition-all duration-300 bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg hover:shadow-accent/5">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1">
          <Link
            href={`/prompts/${prompt.name}`}
            className="hover:underline hover:text-accent transition-colors"
          >
            <h3 className="font-semibold text-lg text-foreground">
              {prompt.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs bg-secondary/50 text-muted-foreground"
            >
              <GitBranch className="w-3 h-3 mr-1" />v{prompt.version}
            </Badge>
            {prompt.active && (
              <Badge
                variant="secondary"
                className="text-xs bg-success/10 text-success border-success/20"
              >
                Active
              </Badge>
            )}
          </div>
        </div>

        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={
                    prompt.active
                      ? `/prompts/${prompt.name}`
                      : `/prompts/${prompt.name}/versions/${prompt.version}`
                  }
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      prompt.active
                        ? `/prompts/${prompt.name}`
                        : `/prompts/${prompt.name}/versions/${prompt.version}`
                    }
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(prompt.name)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 font-mono">
          {prompt.template}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(prompt.created_at), {
              addSuffix: true,
            })}
          </span>
          {prompt.variables.length > 0 && (
            <span className="flex items-center gap-1">
              {prompt.variables.length} variable
              {prompt.variables.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
