"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Global Error Page
 *
 * Catches errors in the root layout and provides recovery options.
 * This is a Next.js convention file that must be a Client Component.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }

    // TODO: Log to error tracking service in production
    // Sentry.captureException(error, {
    //   tags: { errorBoundary: "global" },
    //   extra: { digest: error.digest }
    // });
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-border/60 bg-card/50 p-8 text-center backdrop-blur-sm">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Oops! Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                {error.message || "An unexpected error occurred"}
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
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto text-xs text-foreground">
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => reset()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>

            {/* Help text */}
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
