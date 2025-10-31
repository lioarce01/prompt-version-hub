"use client";

import { useMemo } from "react";

interface VariantDistributionChartProps {
  variants: Record<string, { count: number; percentage: number }>;
  totalAssignments: number;
}

export function VariantDistributionChart({
  variants,
  totalAssignments,
}: VariantDistributionChartProps) {
  const sortedVariants = useMemo(() => {
    return Object.entries(variants).sort(([a], [b]) => Number(a) - Number(b));
  }, [variants]);

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-orange-500",
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-border bg-background/50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Total Assignments
          </p>
          <p className="text-2xl font-bold text-foreground">
            {totalAssignments.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Visual Distribution Bars */}
      <div className="space-y-4">
        {sortedVariants.map(([version, data], index) => {
          const colorClass = colors[index % colors.length];

          return (
            <div key={version} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${colorClass}`}
                  />
                  <span className="font-medium text-foreground">
                    Version {version}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {data.count.toLocaleString()} users
                  </span>
                  <span className="font-semibold text-foreground min-w-[3rem] text-right">
                    {data.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${colorClass} transition-all duration-500`}
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
        {sortedVariants.map(([version, data], index) => {
          const colorClass = colors[index % colors.length];

          return (
            <div
              key={version}
              className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2"
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${colorClass}`}
              />
              <span className="text-xs font-medium text-foreground">
                v{version}
              </span>
              <span className="text-xs text-muted-foreground">
                {data.percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
