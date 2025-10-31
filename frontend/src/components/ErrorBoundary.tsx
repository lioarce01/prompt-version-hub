"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Error Boundary Component
 *
 * Catches React errors in child components and displays a fallback UI
 * following the app's minimalist design aesthetic.
 *
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Error Info:", errorInfo);
    }

    // TODO: In production, log to error tracking service (Sentry)
    // Sentry.captureException(error, {
    //   contexts: { react: { componentStack: errorInfo.componentStack } }
    // });

    this.setState({
      errorInfo: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI - minimalist design matching app style
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-border/60 bg-card/50 p-8 text-center backdrop-blur-sm">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>

            {/* Error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="rounded-lg border border-border/60 bg-background/50 p-3 text-left">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-foreground">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={this.handleReset}
                className="gap-2"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
