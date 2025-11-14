"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { create_query_client } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import { AuthSyncProvider } from "@/components/auth/AuthSyncProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create query client and persister only once per component lifecycle
  const [queryClient] = useState(() => create_query_client());

  const [persister] = useState(() =>
    typeof window !== "undefined"
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: "REACT_QUERY_OFFLINE_CACHE",
        })
      : undefined
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSyncProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <QueryErrorBoundary>{children}</QueryErrorBoundary>
          </ErrorBoundary>
          <Toaster
            position="top-right"
            offset={16}
            visibleToasts={4}
            closeButton
            richColors
            expand={false}
          />
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthSyncProvider>
    </QueryClientProvider>
  );
}
