"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface PromptTableProps {
  prompts: Prompt[];
  onDelete?: (name: string) => void;
}

export function PromptTable({ prompts, onDelete }: PromptTableProps) {
  const { canEdit, canDelete } = useRole();

  if (prompts.length === 0) {
    return (
      <div className="border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                No prompts found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-muted-foreground">Name</TableHead>
            <TableHead className="text-muted-foreground">Template</TableHead>
            <TableHead className="text-muted-foreground">Version</TableHead>
            <TableHead className="text-muted-foreground">Visibility</TableHead>
            <TableHead className="text-muted-foreground">Owner</TableHead>
            <TableHead className="text-muted-foreground">Variables</TableHead>
            <TableHead className="text-muted-foreground">Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prompts.map((prompt) => (
            <TableRow
              key={prompt.id}
              className="hover:bg-secondary/30 transition-colors border-border/50"
            >
              <TableCell className="font-medium">
                <Link
                  href={`/prompts/${prompt.name}`}
                  className="flex items-center gap-2 hover:text-accent transition-colors text-white"
                >
                  <span>{prompt.name}</span>
                  {prompt.active && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-success/10 text-success border-success/20"
                    >
                      Active
                    </Badge>
                  )}
                </Link>
              </TableCell>
              <TableCell className="max-w-md">
                <p className="text-sm text-muted-foreground truncate font-mono">
                  {prompt.template}
                </p>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className="text-xs bg-secondary/50 text-muted-foreground"
                >
                  <GitBranch className="w-3 h-3 mr-1" />v{prompt.version}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    prompt.is_public
                      ? "text-xs border-accent/40 text-accent"
                      : "text-xs border-muted-foreground/40 text-muted-foreground"
                  }
                >
                  {prompt.is_public ? "Public" : "Private"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                User #{prompt.created_by}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {prompt.variables.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {prompt.variables.slice(0, 2).map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="text-xs bg-secondary/30 border-border/50"
                      >
                        {variable}
                      </Badge>
                    ))}
                    {prompt.variables.length > 2 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-secondary/30 border-border/50"
                      >
                        +{prompt.variables.length - 2}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">None</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(prompt.created_at), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell>
                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/prompts/${prompt.name}`}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/prompts/${prompt.name}?edit=true`}
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

