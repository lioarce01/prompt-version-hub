"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistStore } from "redux-persist";
import { ThemeProvider } from "next-themes";
import { makeStore, type AppStore } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  const persistorRef = useRef<any>(null);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
    persistorRef.current = persistStore(storeRef.current);
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <Provider store={storeRef.current}>
        <PersistGate loading={null} persistor={persistorRef.current}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster
            position="top-right"
            offset={16}
            visibleToasts={4}
            closeButton
            richColors
            expand={false}
          />
        </PersistGate>
      </Provider>
    </ThemeProvider>
  );
}
