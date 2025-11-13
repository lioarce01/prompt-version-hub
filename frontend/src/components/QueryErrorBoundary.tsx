"use client";

import React, { Component, ReactNode } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary wrapper for TanStack Query
 *
 * Catches errors thrown by useQuery/useMutation and provides
 * a user-friendly error UI with retry functionality.
 *
 * Usage:
 * ```tsx
 * <QueryErrorBoundary>
 *   <YourComponent />
 * </QueryErrorBoundary>
 * ```
 */
class ErrorBoundaryClass extends Component<
  Props & { reset: () => void },
  State
> {
  constructor(props: Props & { reset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props & { reset: () => void }) {
    if (this.state.hasError && prevProps.reset !== this.props.reset) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.props.reset);
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold mb-2">
              Something went wrong
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm">
                {this.state.error.message ||
                  "An unexpected error occurred while loading data."}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    this.props.reset();
                  }}
                  className="gap-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Reload page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * QueryErrorBoundary component with TanStack Query integration
 *
 * Automatically resets query errors when the user clicks "Try again"
 */
export function QueryErrorBoundary({ children, fallback }: Props) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundaryClass reset={reset} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

/**
 * Hook to create custom error fallback components
 *
 * Example:
 * ```tsx
 * function CustomErrorFallback({ error, reset }: ErrorFallbackProps) {
 *   return (
 *     <div>
 *       <h2>Error: {error.message}</h2>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   );
 * }
 * ```
 */
export interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}
