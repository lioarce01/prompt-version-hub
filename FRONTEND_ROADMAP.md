# Frontend Roadmap - Prompt Version Hub

## 🎯 Objetivo
Desarrollar una UI minimalista y funcional para el Prompt Version Hub, siguiendo el diseño de Vercel/Geist con shadcn/ui.

## 🎨 Stack Técnico

- **Framework**: Next.js 15.5.5 (App Router)
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS 4 + Geist Design System colors
- **Charts**: Recharts (para analytics)
- **Notifications**: Sonner (toast minimalista)
- **Fonts**: Geist Sans + Geist Mono
- **TypeScript**: Strict mode

## 🎨 Diseño y UX

### Principios
- **Minimalista**: UI limpia, no sobrecargada
- **Colores Vercel**: Negro/blanco/grises con acentos sutiles
- **Espaciado generoso**: Evitar páginas "llenas"
- **Typography**: Geist Sans para UI, Geist Mono para código
- **Responsive**: Mobile-first approach
- **Performance**: Code splitting, lazy loading

### Paleta de Colores (Geist)
```
Background: #000000 (dark) / #FFFFFF (light)
Foreground: #FFFFFF (dark) / #000000 (light)
Muted: #171717 / #FAFAFA
Border: #262626 / #E5E5E5
Accent: #0070F3 (Vercel blue)
Success: #00E676
Error: #F44336
Warning: #FFB300
```

## 📁 Estructura de Carpetas

```
frontend/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth routes group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Protected routes group
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   ├── page.tsx             # Home/Prompts list
│   │   ├── prompts/
│   │   │   ├── new/
│   │   │   └── [name]/
│   │   │       ├── page.tsx
│   │   │       └── versions/
│   │   ├── deployments/
│   │   ├── experiments/
│   │   └── analytics/
│   ├── layout.tsx               # Root layout
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── layout/                  # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── prompts/                 # Prompt-specific components
│   │   ├── PromptCard.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── PromptPreview.tsx
│   │   ├── VersionTimeline.tsx
│   │   └── DiffViewer.tsx
│   ├── deployments/
│   │   ├── EnvironmentCard.tsx
│   │   └── DeploymentHistory.tsx
│   ├── experiments/
│   │   ├── ExperimentCard.tsx
│   │   └── ABPolicyForm.tsx
│   └── analytics/
│       ├── UsageChart.tsx
│       └── MetricsCard.tsx
├── features/                    # Redux slices
│   ├── auth/
│   │   ├── authSlice.ts
│   │   └── authApi.ts
│   ├── prompts/
│   │   └── promptsApi.ts
│   ├── deployments/
│   │   └── deploymentsApi.ts
│   ├── experiments/
│   │   └── experimentsApi.ts
│   └── analytics/
│       └── analyticsApi.ts
├── lib/
│   ├── store.ts                 # Redux store config
│   ├── api.ts                   # RTK Query base API
│   └── utils.ts                 # Utility functions
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   └── useProtectedRoute.ts
└── types/
    ├── api.ts                   # API response types
    ├── prompts.ts
    ├── deployments.ts
    └── experiments.ts
```

---

## 📋 Roadmap Detallado

### ✅ Fase 0: Setup (Fundación)

#### 0.1 Instalar shadcn/ui y dependencias base
```bash
npx shadcn@latest init
npm install @reduxjs/toolkit react-redux
npm install sonner recharts
npm install date-fns clsx class-variance-authority
```

**Componentes shadcn/ui a instalar inicialmente:**
- button
- input
- label
- card
- dialog
- dropdown-menu
- table
- badge
- skeleton
- toast/sonner
- tabs
- select
- textarea
- alert

#### 0.2 Configurar Tailwind con colores Geist/Vercel
- Actualizar `tailwind.config.ts` con paleta Geist
- Configurar CSS variables en `globals.css`
- Setup dark mode (class-based)

#### 0.3 Instalar y configurar RTK Query + Redux store
- Crear store en `lib/store.ts`
- Configurar RTK Query base API con baseUrl
- Setup de interceptors para tokens JWT
- Configurar Redux Provider en layout

#### 0.4 Crear estructura de carpetas
- Crear todas las carpetas según estructura
- Crear archivos `.gitkeep` o index files
- Setup de path aliases en `tsconfig.json`

**Criterio de éxito:**
- ✅ shadcn/ui instalado y funcional
- ✅ Tailwind con colores Geist aplicados
- ✅ Redux store configurado
- ✅ Estructura de carpetas creada

---

### 🔐 Fase 1: Autenticación (Prioridad Máxima)

**Objetivo:** Usuario puede registrarse, loguearse, y acceder a rutas protegidas.

#### 1.1 Crear página de Login (`/login`)
- Form con email + password
- Validación client-side
- Botón de "Register" link
- Loading states
- Error handling

**Componentes necesarios:**
- `LoginForm.tsx`
- shadcn: `Button`, `Input`, `Label`, `Card`

#### 1.2 Crear página de Register (`/register`)
- Form con email + password + confirm password
- Validación de contraseña fuerte
- Link a Login
- Mensajes de éxito/error

#### 1.3 Implementar RTK Query auth endpoints
**Archivo:** `features/auth/authApi.ts`

```typescript
// Endpoints:
- login(email, password) → { token, user }
- register(email, password) → { token, user }
- getCurrentUser() → { user }
```

#### 1.4 Implementar sistema de tokens
- Guardar token en localStorage
- Configurar interceptor en RTK Query para agregar `Authorization: Bearer {token}`
- Auto-refresh de token (opcional para MVP)
- Limpiar token en logout

#### 1.5 Crear middleware de protección de rutas
**Archivo:** `app/(dashboard)/layout.tsx`

- Verificar token en client-side
- Redirect a `/login` si no autenticado
- Mostrar layout con sidebar solo si autenticado

#### 1.6 Implementar logout y gestión de sesión
- Botón de logout en header/sidebar
- Limpiar store y localStorage
- Redirect a `/login`

#### 1.7 Crear helpers para role-based UI
**Archivos:** `hooks/useAuth.ts`, `hooks/useRole.ts`

```typescript
// useAuth()
{ user, token, isAuthenticated, logout }

// useRole()
{ isAdmin, isEditor, isViewer, canEdit, canDelete }
```

**Criterio de éxito:**
- ✅ Usuario puede registrarse
- ✅ Usuario puede loguearse y obtener token
- ✅ Rutas protegidas redirigen a login
- ✅ Logout funciona correctamente
- ✅ Helpers de roles funcionan

---

### 📝 Fase 2: Prompts Core (Alta Prioridad)

**Objetivo:** CRUD completo de prompts con búsqueda y filtros.

#### 2.1 Crear Dashboard/Home con lista de prompts
**Ruta:** `/` (dashboard layout)

**Features:**
- Tabla/Grid de prompts con columnas:
  - Name
  - Template (truncado)
  - Version (badge con número)
  - Created by
  - Created at
  - Actions (View, Edit, Delete)
- Barra de búsqueda (query por nombre)
- Filtros:
  - Active only
  - Created by me
  - Sort by (name, created_at)
- Paginación (limit 20 por defecto)
- Botón "Create New Prompt" (solo admin/editor)
- Empty state si no hay prompts

**Componentes:**
- `PromptCard.tsx` (vista card)
- `PromptTable.tsx` (vista tabla)
- `SearchBar.tsx`
- `FilterBar.tsx`

#### 2.2 Crear página de crear prompt (`/prompts/new`)
**Solo admin/editor**

**Form fields:**
- Name (text input, unique)
- Template (textarea con syntax highlighting opcional)
- Variables (tags input: `{{variable}}` auto-detectadas)
- Preview panel (lado derecho)

**Validaciones:**
- Name requerido y único
- Template requerido
- Variables deben existir en template

**Componentes:**
- `PromptForm.tsx`
- `VariableInput.tsx`
- `PromptPreview.tsx`

#### 2.3 Crear página de ver/editar prompt (`/prompts/[name]`)
**Modo vista (todos) / modo edición (admin/editor)**

**Vista:**
- Header con nombre + versión actual (badge)
- Template renderizado
- Lista de variables
- Tabs:
  - **Overview**: Template + metadata
  - **Versions**: Timeline de versiones (ver Fase 3)
  - **Deployments**: Dónde está deployado
  - **Analytics**: Stats de uso (ver Fase 6)

**Modo edición:**
- Mismo form que Create
- Al guardar, crea nueva versión
- Mostrar diff preview antes de guardar

**Botones (role-based):**
- Edit (admin/editor)
- Delete (admin)
- Deploy (admin/editor)
- Rollback (admin/editor)

#### 2.4 Implementar preview en vivo con variables
**Componente:** `PromptPreview.tsx`

- Panel lateral o sección inferior
- Inputs dinámicos para cada variable
- Render del template con valores reemplazados
- Copy to clipboard del resultado
- Indicador de variables faltantes

#### 2.5 Implementar RTK Query prompts endpoints
**Archivo:** `features/prompts/promptsApi.ts`

```typescript
// Endpoints:
- getPrompts(filters) → { prompts[], has_next }
- getPrompt(name) → { prompt }
- createPrompt(data) → { prompt }
- updatePrompt(name, data) → { prompt }
- deletePrompt(name) → { success }
- getVersions(name) → { versions[] }
- getVersion(name, version) → { prompt }
- rollback(name, version) → { prompt }
- diff(name, from, to) → { diff }
```

**Criterio de éxito:**
- ✅ Usuario ve lista de prompts con búsqueda
- ✅ Admin/Editor puede crear prompt
- ✅ Usuario puede ver detalle de prompt
- ✅ Admin/Editor puede editar prompt
- ✅ Preview funciona en tiempo real
- ✅ Delete funciona (solo admin)

---

### 🕐 Fase 3: Versionado (Alta Prioridad)

**Objetivo:** Ver historial, comparar versiones, hacer rollback.

#### 3.1 Agregar timeline de versiones en página de prompt
**Tab "Versions" en `/prompts/[name]`**

**Vista:**
- Lista vertical tipo timeline
- Cada versión muestra:
  - Version number (badge)
  - Created at (relativo: "2 days ago")
  - Created by (nombre + avatar)
  - Template preview (primeras 2 líneas)
  - Badge "Active" si es la versión activa
  - Botones:
    - View full version
    - Compare with... (dropdown de otras versiones)
    - Rollback (admin/editor)

**Componentes:**
- `VersionTimeline.tsx`
- `VersionItem.tsx`

#### 3.2 Crear vista de versión específica
**Ruta:** `/prompts/[name]/versions/[version]`

- Mostrar versión completa (read-only)
- Header con:
  - Version number
  - Created at/by
  - Badge "Active" si aplica
  - Botón "Rollback to this version"
  - Botón "Compare with..."
- Template con syntax highlighting
- Lista de variables

#### 3.3 Implementar diff viewer
**Componente:** `DiffViewer.tsx`

**Dos modos:**
- **Unified**: Estilo git diff (con +/- y colores)
- **Side-by-side**: Dos columnas (from | to)

**Features:**
- Toggle entre unified/side-by-side
- Syntax highlighting
- Scroll sincronizado (side-by-side)
- Estadísticas: lines added/removed

**Librería sugerida:** `react-diff-viewer-continued` o custom con `diff` library

#### 3.4 Implementar rollback con modal de confirmación
**Modal:** `RollbackConfirmDialog.tsx`

- Mostrar diff entre versión actual y versión de rollback
- Texto: "This will create a new version (v{N}) with the content of v{M}"
- Botones: Cancel / Confirm Rollback
- Loading state durante rollback
- Toast de éxito/error
- Redirect a nueva versión creada

**Criterio de éxito:**
- ✅ Timeline de versiones se muestra correctamente
- ✅ Usuario puede ver versión específica
- ✅ Diff viewer funciona (unified y side-by-side)
- ✅ Rollback crea nueva versión correctamente
- ✅ Toast notifications funcionan

---

### 🚀 Fase 4: Deployments (Media Prioridad)

**Objetivo:** Deploy prompts a environments (dev/staging/prod).

#### 4.1 Crear panel de entornos (`/deployments`)
**Vista:**
- 3 cards grandes (dev, staging, prod)
- Cada card muestra:
  - Environment name + icon/badge
  - Deployed prompt name + version
  - Deployed at (relativo)
  - Deployed by (nombre)
  - Botón "Deploy to {env}" (admin/editor)
  - Botón "View History"

**Componentes:**
- `EnvironmentCard.tsx`
- `DeployButton.tsx`

#### 4.2 Implementar deploy modal/wizard
**Modal:** `DeployModal.tsx`

**Steps:**
1. Select prompt (dropdown con búsqueda)
2. Select version (dropdown de versiones del prompt)
3. Select environment (radio buttons: dev/staging/prod)
4. Confirm (mostrar resumen)

**Validaciones:**
- Prompt requerido
- Version requerida
- Environment requerido
- Confirmación si environment ya tiene deployment

**Success:**
- Toast de éxito
- Actualizar card de environment
- Cerrar modal

#### 4.3 Agregar historial de deployments por environment
**Vista:** En la misma página `/deployments`, sección inferior o tab "History"

- Tabla con columnas:
  - Environment
  - Prompt name
  - Version
  - Deployed at
  - Deployed by
- Filtros:
  - Por environment
  - Por prompt
  - Por fecha (last 7/30/90 days)
- Paginación

**Componentes:**
- `DeploymentHistory.tsx`

#### 4.4 Implementar RTK Query deployments endpoints
**Archivo:** `features/deployments/deploymentsApi.ts`

```typescript
// Endpoints:
- deploy(prompt_name, version, environment) → { deployment }
- getDeployment(environment) → { deployment }
- getDeploymentHistory(filters) → { deployments[] }
```

**Criterio de éxito:**
- ✅ Usuario ve estado actual de cada environment
- ✅ Admin/Editor puede hacer deploy
- ✅ Historial se muestra correctamente
- ✅ Validaciones funcionan

---

### 🧪 Fase 5: A/B Testing (Media Prioridad)

**Objetivo:** Crear experimentos A/B manuales con políticas de weights.

#### 5.1 Crear dashboard de experimentos (`/experiments`)
**Vista:**
- Lista de políticas A/B activas
- Cada card muestra:
  - Prompt name
  - Versions siendo testeadas (badges: v1, v2)
  - Weights (ej: 50% / 50%)
  - Stats básicas:
    - Total assignments
    - Success rate por versión
  - Botones:
    - Edit policy (admin)
    - View details
    - Delete (admin)
- Botón "Create A/B Test" (admin)
- Empty state si no hay experimentos

**Componentes:**
- `ExperimentCard.tsx`
- `ExperimentList.tsx`

#### 5.2 Implementar crear/editar política A/B
**Modal/Page:** `ABPolicyForm.tsx`

**Form fields:**
- Prompt name (select de prompts existentes)
- Versions to test (multi-select de versiones del prompt)
- Weights (inputs numéricos, suma debe ser 100%)
  - Ejemplo: v1: 50%, v2: 50%
  - Slider visual opcional
- Experiment name (opcional, para tracking)

**Validaciones:**
- Prompt requerido
- Al menos 2 versiones
- Weights suman 100%

**Visualización:**
- Preview de distribución (pie chart pequeño)

#### 5.3 Mostrar estadísticas básicas de experimentos
**Vista:** En detalle de experimento o tab "Stats"

**Métricas:**
- Total assignments (por versión)
- Success rate (por versión)
- Avg latency (por versión)
- Total cost (por versión)
- Distribución real vs esperada (gráfico)

**Componentes:**
- `ExperimentStats.tsx`
- `AssignmentChart.tsx`

#### 5.4 Implementar RTK Query experiments endpoints
**Archivo:** `features/experiments/experimentsApi.ts`

```typescript
// Endpoints:
- createPolicy(prompt_name, weights) → { policy }
- getPolicy(prompt_name) → { policy }
- updatePolicy(prompt_name, weights) → { policy }
- deletePolicy(prompt_name) → { success }
- getExperimentStats(experiment_name) → { stats }
```

**Criterio de éxito:**
- ✅ Admin puede crear política A/B
- ✅ Política se muestra con weights correctas
- ✅ Stats básicas se visualizan
- ✅ Admin puede editar/eliminar políticas

---

### 📊 Fase 6: Analytics (Baja Prioridad)

**Objetivo:** Dashboard con métricas de uso, costos y performance.

#### 6.1 Crear dashboard de métricas (`/analytics`)
**Vista:**
- Cards superiores con métricas globales:
  - Total requests (30d)
  - Success rate (%)
  - Avg latency (ms)
  - Total cost ($)
- Filtros:
  - Date range (preset: 7d, 30d, 90d, custom)
  - Prompt (select multiple)
  - Success (all, success, failed)
- Gráficos (ver 6.2)

**Componentes:**
- `MetricsCard.tsx`
- `FilterBar.tsx`

#### 6.2 Implementar gráficos de uso (recharts)
**Gráficos:**

1. **Usage over time** (Line chart)
   - X: Fecha
   - Y: Request count
   - Multi-line si filtran múltiples prompts

2. **Success vs Failed** (Pie/Donut chart)
   - % Success
   - % Failed

3. **Latency distribution** (Bar chart)
   - X: Latency buckets (0-100ms, 100-500ms, etc.)
   - Y: Count

4. **Cost over time** (Area chart)
   - X: Fecha
   - Y: Cumulative cost

**Componentes:**
- `UsageChart.tsx`
- `SuccessRateChart.tsx`
- `LatencyChart.tsx`
- `CostChart.tsx`

#### 6.3 Agregar filtros por fecha, prompt, éxito
**Componente:** `AnalyticsFilters.tsx`

- Date range picker (shadcn calendar)
- Prompt multi-select (con búsqueda)
- Success filter (radio: all/success/failed)
- Botón "Apply Filters"
- Botón "Clear Filters"

Filtros persisten en URL query params para compartir links.

#### 6.4 Implementar RTK Query analytics endpoints
**Archivo:** `features/analytics/analyticsApi.ts`

```typescript
// Endpoints:
- getUsageStats(filters) → { stats, timeseries }
- getSuccessRate(filters) → { success_count, failed_count }
- getLatencyStats(filters) → { avg, p50, p95, p99, distribution }
- getCostStats(filters) → { total_cost, timeseries }
```

**Criterio de éxito:**
- ✅ Dashboard muestra métricas globales
- ✅ Gráficos renderizan correctamente
- ✅ Filtros aplican y actualizan gráficos
- ✅ Performance es aceptable con muchos datos

---

### 🎨 Fase 7: Pulido y UX (Última Fase)

**Objetivo:** Mejorar experiencia de usuario con detalles de polish.

#### 7.1 Agregar error boundaries
**Componente:** `ErrorBoundary.tsx`

- Catch errors en componentes hijos
- Mostrar UI de error amigable
- Botón "Try again" que resetea boundary
- Log error a console (o servicio externo)

Usar en:
- Root layout
- Cada página principal
- Componentes complejos (charts, etc.)

#### 7.2 Agregar loading skeletons
**Componentes:** `PromptSkeleton.tsx`, `ChartSkeleton.tsx`, etc.

- Usar shadcn `Skeleton` component
- Loading states para:
  - Lista de prompts
  - Detalle de prompt
  - Gráficos
  - Tablas
  - Forms (botones con spinner)

**Pattern:**
```typescript
{isLoading ? <PromptSkeleton /> : <PromptCard />}
```

#### 7.3 Implementar toast notifications (sonner)
**Setup global en root layout**

**Usar para:**
- Success actions (create, update, delete, deploy)
- Errors de API
- Confirmaciones (copied to clipboard, etc.)

**Tipos:**
- Success (verde)
- Error (rojo)
- Warning (amarillo)
- Info (azul)

**Componente:** Pre-configurado con `sonner` library

#### 7.4 Crear empty states para todas las vistas
**Componentes:** `EmptyState.tsx`

**Props:** icon, title, description, action (button)

**Usar en:**
- No prompts yet → "Create your first prompt"
- No deployments → "Deploy your first prompt"
- No experiments → "Start your first A/B test"
- No analytics data → "No usage data yet"
- Search with no results → "No prompts found"

**Diseño:** Centrado, icon grande, texto corto, CTA claro

#### 7.5 Responsive design
- Revisar todas las páginas en mobile
- Sidebar collapsa a hamburger menu
- Tablas se convierten en cards en mobile
- Forms stacked verticalmente
- Charts responsive (recharts tiene soporte built-in)

#### 7.6 Animaciones sutiles (opcional)
- Fade in/out para modals
- Slide in para sidebar
- Hover effects en cards/buttons
- Loading spinners

**Librería:** `framer-motion` (opcional, solo si queda tiempo)

**Criterio de éxito:**
- ✅ Errors se manejan gracefully
- ✅ Loading states en todas las vistas
- ✅ Toasts funcionan correctamente
- ✅ Empty states se ven bien
- ✅ App es usable en mobile
- ✅ Animaciones son sutiles y performantes

---

## 🚦 Criterios de Aceptación del MVP

### Funcional
- ✅ Usuario puede registrarse y loguearse
- ✅ Admin/Editor puede crear/editar prompts
- ✅ Usuario puede ver versiones y hacer rollback
- ✅ Admin/Editor puede hacer deploy a environments
- ✅ Admin puede crear experimentos A/B
- ✅ Usuario puede ver analytics básicas

### UX/UI
- ✅ Diseño minimalista estilo Vercel
- ✅ Responsive (mobile y desktop)
- ✅ Loading states en todas las acciones async
- ✅ Error handling con mensajes claros
- ✅ Navegación intuitiva

### Performance
- ✅ First load < 3s
- ✅ Time to interactive < 5s
- ✅ No layout shifts
- ✅ Images optimizadas (si aplica)

### Code Quality
- ✅ TypeScript sin errors
- ✅ Components reutilizables
- ✅ No console errors
- ✅ Biome lint passing

---

## 📝 Notas de Implementación

### Orden de Prioridad (para desarrollo)
1. **Setup** → Base técnica
2. **Auth** → Bloqueante para todo lo demás
3. **Prompts Core** → Feature principal
4. **Versionado** → Core value prop
5. **Deployments** → Importante para workflow
6. **A/B Testing** → Nice to have
7. **Analytics** → Can wait
8. **Pulido** → Continuous

### Decisiones Técnicas

#### ¿Por qué RTK Query?
- Caché automático
- Loading/error states built-in
- Menos boilerplate que axios + useState
- Integración perfecta con Redux

#### ¿Por qué shadcn/ui?
- Componentes copiables (no librería externa pesada)
- Basado en Radix (accesible)
- Estilizable con Tailwind
- Minimalista por defecto

#### ¿Por qué no Server Components para todo?
- Auth requiere client-side state
- Forms con validación necesitan interactividad
- Simplifica debugging en MVP
- Podemos migrar a RSC después

### Testing (Post-MVP)
```bash
# Unit tests
npm install -D vitest @testing-library/react

# E2E tests
npm install -D playwright
```

---

## 🔧 Comandos Útiles

```bash
# Dev
npm run dev

# Build
npm run build

# Lint
npm run lint

# Format
npm run format

# Add shadcn component
npx shadcn@latest add button

# Type check
npx tsc --noEmit
```

---

## 📚 Referencias

- [shadcn/ui docs](https://ui.shadcn.com/)
- [Vercel Design System (Geist)](https://vercel.com/geist)
- [RTK Query Tutorial](https://redux-toolkit.js.org/tutorials/rtk-query)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Última actualización:** 2025-10-15
