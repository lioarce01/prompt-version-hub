# Error Boundaries - Planning

## Objetivo
Capturar y manejar errores de React de forma elegante sin que la app completa crashee.

---

## Implementación

### 1. Error Boundary Component (Client Component)
**Archivo**: `frontend/src/components/ErrorBoundary.tsx`

```tsx
"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // TODO: Log to Sentry when integrated
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 2. Next.js Error Pages

#### Global Error (App Crash)
**Archivo**: `frontend/src/app/error.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
    // TODO: Log to Sentry
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">
          Oops! Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Dashboard Error
**Archivo**: `frontend/src/app/(dashboard)/error.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border/60 bg-card/50 p-8 text-center backdrop-blur-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">
          Failed to load this page
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Something went wrong"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Wrap Critical Sections

#### Providers with ErrorBoundary
**Archivo**: `frontend/src/components/providers.tsx`

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  // ... existing code

  return (
    <ThemeProvider {...}>
      <Provider store={storeRef.current}>
        <PersistGate loading={null} persistor={persistorRef.current}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster {...} />
        </PersistGate>
      </Provider>
    </ThemeProvider>
  );
}
```

#### Individual Features (Optional)
Wrap features críticas individualmente:

```tsx
// En dashboard cards, modales complejos, etc.
<ErrorBoundary fallback={<FeatureErrorFallback />}>
  <ComplexFeature />
</ErrorBoundary>
```

---

### 4. Not Found Page (404)
**Archivo**: `frontend/src/app/not-found.tsx`

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <h2 className="text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
```

---

## Testing Error Boundaries

### Test Component
**Archivo**: `frontend/src/components/TestError.tsx` (solo para dev)

```tsx
"use client";

import { Button } from "@/components/ui/button";

export function TestError() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <Button
      variant="destructive"
      onClick={() => {
        throw new Error("Test error boundary");
      }}
    >
      Test Error
    </Button>
  );
}
```

---

## Checklist

- [ ] Crear `ErrorBoundary.tsx` component
- [ ] Crear `app/error.tsx` (global)
- [ ] Crear `app/(dashboard)/error.tsx` (dashboard)
- [ ] Crear `app/not-found.tsx` (404)
- [ ] Integrar ErrorBoundary en `providers.tsx`
- [ ] Probar con TestError component
- [ ] Verificar en dev y build mode
- [ ] (Futuro) Integrar logging con Sentry

---

## Estimación
**Tiempo total**: 2-3 horas

- ErrorBoundary component: 30 min
- Error pages (3): 1 hora
- Integration & testing: 1 hora
- Polish & edge cases: 30 min

---

## Notas

- Error boundaries solo capturan errores en **render**, no en:
  - Event handlers (usar try/catch)
  - Async code (usar try/catch)
  - Server-side rendering
  - Errores en el error boundary mismo

- Next.js 13+ App Router tiene sus propias convenciones:
  - `error.tsx` → Client component obligatorio
  - `global-error.tsx` → Para errores en root layout
  - `not-found.tsx` → 404 custom page

- Para producción, integrar con Sentry:
  ```bash
  npm install @sentry/nextjs
  ```

  Y en `componentDidCatch`:
  ```tsx
  Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo } } });
  ```
