"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

/**
 * Dashboard Error Page
 *
 * Catches errors within the dashboard layout.
 * Provides contextual recovery options specific to dashboard pages.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Dashboard error:", error);
    }

    // TODO: Log to error tracking service in production
    // Sentry.captureException(error, {
    //   tags: { errorBoundary: "dashboard" },
    //   extra: { digest: error.digest }
    // });
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-border/60 bg-card/50 p-8 text-center backdrop-blur-sm">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Failed to load this page
          </h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "Something went wrong while loading this page"}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Error details in development */}
        {process.env.NODE_ENV === "development" && (
          <details className="rounded-lg border border-border/60 bg-background/50 p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-foreground">
              {error.stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()} className="gap-2" size="sm">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 sm:w-auto"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Additional help */}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">You can also try:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/prompts">
              <Button variant="ghost" size="sm" className="text-xs">
                Prompts
              </Button>
            </Link>
            <Link href="/deployments">
              <Button variant="ghost" size="sm" className="text-xs">
                Deployments
              </Button>
            </Link>
            <Link href="/experiments">
              <Button variant="ghost" size="sm" className="text-xs">
                Experiments
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
