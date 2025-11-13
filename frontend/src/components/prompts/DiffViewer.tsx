"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DiffEntryType = "unchanged" | "added" | "removed";

interface DiffEntry {
  type: DiffEntryType;
  value: string;
}

interface DiffViewerProps {
  original: string;
  updated: string;
}

function buildDiff(original: string, updated: string): DiffEntry[] {
  const originalLines = original.split("\n");
  const updatedLines = updated.split("\n");

  const m = originalLines.length;
  const n = updatedLines.length;

  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (originalLines[i] === updatedLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const diff: DiffEntry[] = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (originalLines[i] === updatedLines[j]) {
      diff.push({ type: "unchanged", value: originalLines[i] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      diff.push({ type: "removed", value: originalLines[i] });
      i += 1;
    } else {
      diff.push({ type: "added", value: updatedLines[j] });
      j += 1;
    }
  }

  while (i < m) {
    diff.push({ type: "removed", value: originalLines[i] });
    i += 1;
  }

  while (j < n) {
    diff.push({ type: "added", value: updatedLines[j] });
    j += 1;
  }

  return diff;
}

const typeStyles: Record<DiffEntryType, string> = {
  unchanged: "bg-transparent text-muted-foreground",
  added: "bg-success/10 text-success",
  removed: "bg-destructive/10 text-destructive",
};

const typeLabels: Record<DiffEntryType, string> = {
  unchanged: "Unchanged",
  added: "Added",
  removed: "Removed",
};

export function DiffViewer({ original, updated }: DiffViewerProps) {
  const diff = useMemo(() => buildDiff(original, updated), [original, updated]);
  const hasChanges = useMemo(() => original !== updated, [original, updated]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Diff Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-success/10 text-success border-success/20">
              + Added
            </Badge>
            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
              − Removed
            </Badge>
          </div>
        </div>
        {!hasChanges && (
          <p className="text-xs text-muted-foreground">
            No changes detected between the current template and the edited
            version.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="scrollbar-slim max-h-72 overflow-y-auto rounded border border-border/50">
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {diff.map((entry, idx) => {
              const prefix =
                entry.type === "added"
                  ? "+"
                  : entry.type === "removed"
                    ? "−"
                    : " ";
              return (
                <span
                  key={`${entry.type}-${idx}`}
                  className={`block rounded px-2 py-1 ${typeStyles[entry.type]}`}
                  aria-label={typeLabels[entry.type]}
                >
                  {prefix} {entry.value || " "}
                </span>
              );
            })}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
