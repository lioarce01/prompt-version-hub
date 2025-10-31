"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

/**
 * Global 404 Not Found Page
 *
 * Displayed when a user navigates to a non-existent route.
 * Provides helpful navigation options to get back to the app.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border/60 bg-card/50 p-8 text-center backdrop-blur-sm">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full border border-border/60 bg-muted/50 p-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-xl font-semibold text-foreground">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button className="w-full gap-2 sm:w-auto">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Quick Links */}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Quick links:
          </p>
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
            <Link href="/ai-generator">
              <Button variant="ghost" size="sm" className="text-xs">
                AI Generator
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
