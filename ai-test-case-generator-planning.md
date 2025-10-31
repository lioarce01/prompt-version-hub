# AI Test Case Generator - Planning

## Objetivo
Generar y ejecutar test cases automáticamente para cada prompt, validar calidad, y detectar regresiones entre versiones.

---

## Arquitectura

```
Prompt → AI Analysis → Generate Test Cases → Execute Tests → Report Results
                ↓                              ↓
         Edge Cases Detection          Compare Versions
```

---

## Backend Implementation

### 1. Database Schema

**Nueva tabla**: `test_cases`
```sql
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    input_text TEXT NOT NULL,
    expected_output TEXT,  -- Optional: for validation
    category VARCHAR(50),  -- 'edge_case', 'happy_path', 'negative'
    auto_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_test_cases_prompt_id ON test_cases(prompt_id);
```

**Nueva tabla**: `test_runs`
```sql
CREATE TABLE test_runs (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id),
    version INTEGER NOT NULL,
    test_case_id INTEGER REFERENCES test_cases(id),
    input_text TEXT NOT NULL,
    output_text TEXT,
    success BOOLEAN,
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_test_runs_prompt_version ON test_runs(prompt_id, version);
```

---

### 2. AI Test Generation Service

**Archivo**: `backend/app/services/test_generator.py`

```python
from typing import List, Dict
import google.generativeai as genai
from app.config import settings

class TestCaseGenerator:
    """Genera test cases usando IA"""

    def __init__(self):
        genai.configure(api_key=settings.google_genai_api_key)
        self.model = genai.GenerativeModel(settings.google_genai_model)

    def generate_test_cases(
        self,
        prompt_template: str,
        variables: List[str],
        count: int = 5
    ) -> List[Dict]:
        """
        Genera test cases para un prompt dado

        Returns: [
            {
                "name": "Short input test",
                "input": {"var1": "value1"},
                "category": "edge_case",
                "expected_behavior": "Should summarize in 1 sentence"
            }
        ]
        """
        generation_prompt = f"""
You are a QA engineer testing an AI prompt system.

PROMPT TEMPLATE:
{prompt_template}

VARIABLES: {', '.join(variables)}

Generate {count} diverse test cases covering:
1. Happy path scenarios (typical usage)
2. Edge cases (empty, very long, special chars)
3. Boundary conditions (min/max lengths)
4. Negative cases (invalid inputs)

For each test case provide:
- name: descriptive test name
- category: "happy_path", "edge_case", "boundary", "negative"
- input: JSON object with values for each variable
- expected_behavior: what should happen

Return as JSON array.
"""

        response = self.model.generate_content(generation_prompt)
        # Parse JSON response
        import json
        test_cases = json.loads(response.text)

        return test_cases

    def analyze_prompt_complexity(self, prompt_template: str) -> Dict:
        """Analiza complejidad y sugiere cantidad de tests"""
        analysis_prompt = f"""
Analyze this prompt and determine:
1. Complexity level (1-10)
2. Number of conditional branches
3. Recommended test cases count
4. Critical edge cases to test

PROMPT:
{prompt_template}

Return JSON with: complexity, branches, recommended_tests, critical_edges
"""
        response = self.model.generate_content(analysis_prompt)
        import json
        return json.loads(response.text)
```

---

### 3. Test Execution Service

**Archivo**: `backend/app/services/test_executor.py`

```python
from typing import List, Dict
import time
from app.services.test_generator import TestCaseGenerator

class TestExecutor:
    """Ejecuta test cases contra prompts"""

    def __init__(self):
        self.generator = TestCaseGenerator()

    def execute_test_case(
        self,
        prompt_template: str,
        test_input: Dict[str, str]
    ) -> Dict:
        """Ejecuta un test case y retorna resultado"""

        # Rellenar template con variables
        filled_prompt = prompt_template
        for var, value in test_input.items():
            filled_prompt = filled_prompt.replace(f"{{{{{var}}}}}", value)

        # Ejecutar contra LLM
        start_time = time.time()
        try:
            response = self.generator.model.generate_content(filled_prompt)
            latency_ms = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "output": response.text,
                "latency_ms": latency_ms,
                "tokens_used": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else None,
                "error": None
            }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "success": False,
                "output": None,
                "latency_ms": latency_ms,
                "tokens_used": None,
                "error": str(e)
            }

    def run_test_suite(
        self,
        prompt_id: int,
        version: int,
        test_cases: List[Dict],
        db
    ) -> Dict:
        """Ejecuta suite completo de tests"""
        results = []

        for test_case in test_cases:
            result = self.execute_test_case(
                test_case["prompt_template"],
                test_case["input"]
            )

            # Guardar resultado en DB
            test_run = TestRun(
                prompt_id=prompt_id,
                version=version,
                test_case_id=test_case.get("id"),
                input_text=str(test_case["input"]),
                output_text=result["output"],
                success=result["success"],
                latency_ms=result["latency_ms"],
                tokens_used=result["tokens_used"],
                error_message=result["error"]
            )
            db.add(test_run)
            results.append(result)

        db.commit()

        # Calcular métricas
        total = len(results)
        passed = sum(1 for r in results if r["success"])
        avg_latency = sum(r["latency_ms"] for r in results) / total if total > 0 else 0

        return {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": passed / total if total > 0 else 0,
            "avg_latency_ms": avg_latency,
            "results": results
        }
```

---

### 4. API Endpoints

**Archivo**: `backend/app/routers/tests.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, Prompt, TestCase, TestRun
from app.services.test_generator import TestCaseGenerator
from app.services.test_executor import TestExecutor
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/tests", tags=["tests"])

# === Schemas ===
class GenerateTestsRequest(BaseModel):
    prompt_name: str
    count: int = 5

class TestCaseCreate(BaseModel):
    name: str
    input_text: str
    expected_output: Optional[str] = None
    category: str

class RunTestsRequest(BaseModel):
    prompt_name: str
    version: Optional[int] = None  # None = active version
    test_case_ids: Optional[List[int]] = None  # None = all tests

# === Endpoints ===

@router.post("/generate")
def generate_test_cases(
    request: GenerateTestsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Genera test cases automáticamente para un prompt"""

    # Obtener prompt activo
    prompt = db.query(Prompt).filter(
        Prompt.name == request.prompt_name,
        Prompt.active == True
    ).first()

    if not prompt:
        raise HTTPException(404, "Prompt not found")

    # Generar test cases con IA
    generator = TestCaseGenerator()
    test_cases = generator.generate_test_cases(
        prompt.template,
        prompt.variables,
        request.count
    )

    # Guardar en DB
    created_tests = []
    for tc in test_cases:
        test_case = TestCase(
            prompt_id=prompt.id,
            name=tc["name"],
            input_text=str(tc["input"]),
            category=tc["category"],
            auto_generated=True,
            created_by=user.id
        )
        db.add(test_case)
        created_tests.append(test_case)

    db.commit()

    return {
        "generated": len(created_tests),
        "test_cases": [
            {
                "id": tc.id,
                "name": tc.name,
                "category": tc.category,
                "input": tc.input_text
            }
            for tc in created_tests
        ]
    }

@router.post("/run")
def run_test_suite(
    request: RunTestsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Ejecuta suite de tests para un prompt"""

    # Obtener prompt
    if request.version:
        prompt = db.query(Prompt).filter(
            Prompt.name == request.prompt_name,
            Prompt.version == request.version
        ).first()
    else:
        prompt = db.query(Prompt).filter(
            Prompt.name == request.prompt_name,
            Prompt.active == True
        ).first()

    if not prompt:
        raise HTTPException(404, "Prompt not found")

    # Obtener test cases
    query = db.query(TestCase).filter(TestCase.prompt_id == prompt.id)
    if request.test_case_ids:
        query = query.filter(TestCase.id.in_(request.test_case_ids))

    test_cases = query.all()

    if not test_cases:
        raise HTTPException(404, "No test cases found")

    # Preparar test cases para ejecución
    test_suite = [
        {
            "id": tc.id,
            "prompt_template": prompt.template,
            "input": eval(tc.input_text)  # Convert string to dict
        }
        for tc in test_cases
    ]

    # Ejecutar tests
    executor = TestExecutor()
    results = executor.run_test_suite(
        prompt.id,
        prompt.version,
        test_suite,
        db
    )

    return results

@router.get("/results/{prompt_name}")
def get_test_results(
    prompt_name: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Obtiene resultados de tests históricos"""

    # Obtener prompt
    prompt = db.query(Prompt).filter(Prompt.name == prompt_name)
    if version:
        prompt = prompt.filter(Prompt.version == version)
    prompt = prompt.first()

    if not prompt:
        raise HTTPException(404, "Prompt not found")

    # Obtener test runs
    runs = db.query(TestRun).filter(
        TestRun.prompt_id == prompt.id,
        TestRun.version == prompt.version
    ).order_by(TestRun.executed_at.desc()).all()

    # Calcular métricas
    total = len(runs)
    passed = sum(1 for r in runs if r.success)

    return {
        "prompt_name": prompt_name,
        "version": prompt.version,
        "total_runs": total,
        "passed": passed,
        "failed": total - passed,
        "success_rate": passed / total if total > 0 else 0,
        "avg_latency": sum(r.latency_ms for r in runs) / total if total > 0 else 0,
        "runs": [
            {
                "id": r.id,
                "input": r.input_text,
                "output": r.output_text,
                "success": r.success,
                "latency_ms": r.latency_ms,
                "executed_at": r.executed_at
            }
            for r in runs[:10]  # Last 10 runs
        ]
    }

@router.get("/compare/{prompt_name}")
def compare_versions(
    prompt_name: str,
    version_a: int,
    version_b: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Compara resultados de tests entre dos versiones"""

    # Obtener runs de ambas versiones
    runs_a = db.query(TestRun).filter(
        TestRun.prompt_id == Prompt.id,
        Prompt.name == prompt_name,
        TestRun.version == version_a
    ).all()

    runs_b = db.query(TestRun).filter(
        TestRun.prompt_id == Prompt.id,
        Prompt.name == prompt_name,
        TestRun.version == version_b
    ).all()

    # Calcular métricas comparativas
    def calc_metrics(runs):
        total = len(runs)
        if total == 0:
            return {"success_rate": 0, "avg_latency": 0}
        return {
            "success_rate": sum(1 for r in runs if r.success) / total,
            "avg_latency": sum(r.latency_ms for r in runs) / total
        }

    metrics_a = calc_metrics(runs_a)
    metrics_b = calc_metrics(runs_b)

    return {
        "version_a": {
            "version": version_a,
            "metrics": metrics_a
        },
        "version_b": {
            "version": version_b,
            "metrics": metrics_b
        },
        "comparison": {
            "success_rate_diff": metrics_b["success_rate"] - metrics_a["success_rate"],
            "latency_diff_ms": metrics_b["avg_latency"] - metrics_a["avg_latency"],
            "regression_detected": metrics_b["success_rate"] < metrics_a["success_rate"] - 0.1
        }
    }
```

---

## Frontend Implementation

### 1. Types

**Archivo**: `frontend/src/types/tests.ts`

```typescript
export interface TestCase {
  id: number;
  prompt_id: number;
  name: string;
  input_text: string;
  expected_output?: string;
  category: 'happy_path' | 'edge_case' | 'boundary' | 'negative';
  auto_generated: boolean;
  created_at: string;
}

export interface TestRun {
  id: number;
  test_case_id?: number;
  input: string;
  output?: string;
  success: boolean;
  latency_ms: number;
  executed_at: string;
  error_message?: string;
}

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  success_rate: number;
  avg_latency_ms: number;
  results: TestRun[];
}
```

### 2. API Hooks

**Archivo**: `frontend/src/features/tests/testsApi.ts`

```typescript
import { api } from "@/lib/api";
import type { TestCase, TestSuiteResult } from "@/types/tests";

export const testsApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    generateTestCases: builder.mutation<
      { generated: number; test_cases: TestCase[] },
      { prompt_name: string; count?: number }
    >({
      query: (body) => ({
        url: "/tests/generate",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "TestCase", id: "LIST" }],
    }),

    runTestSuite: builder.mutation<
      TestSuiteResult,
      { prompt_name: string; version?: number; test_case_ids?: number[] }
    >({
      query: (body) => ({
        url: "/tests/run",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "TestRun", id: "LIST" }],
    }),

    getTestResults: builder.query<
      TestSuiteResult,
      { prompt_name: string; version?: number }
    >({
      query: ({ prompt_name, version }) => ({
        url: `/tests/results/${prompt_name}`,
        params: version ? { version } : undefined,
      }),
      providesTags: (result, error, { prompt_name }) => [
        { type: "TestRun", id: prompt_name },
      ],
    }),

    compareVersions: builder.query<
      any,
      { prompt_name: string; version_a: number; version_b: number }
    >({
      query: ({ prompt_name, version_a, version_b }) => ({
        url: `/tests/compare/${prompt_name}`,
        params: { version_a, version_b },
      }),
    }),
  }),
});

export const {
  useGenerateTestCasesMutation,
  useRunTestSuiteMutation,
  useGetTestResultsQuery,
  useCompareVersionsQuery,
} = testsApi;
```

### 3. UI Components

**Archivo**: `frontend/src/components/tests/TestSuitePanel.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import {
  useGenerateTestCasesMutation,
  useRunTestSuiteMutation,
  useGetTestResultsQuery,
} from "@/features/tests/testsApi";
import { toast } from "sonner";

interface TestSuitePanelProps {
  promptName: string;
  version?: number;
}

export function TestSuitePanel({ promptName, version }: TestSuitePanelProps) {
  const [generateTests, { isLoading: isGenerating }] = useGenerateTestCasesMutation();
  const [runTests, { isLoading: isRunning }] = useRunTestSuiteMutation();
  const { data: results, isLoading: isLoadingResults } = useGetTestResultsQuery({
    prompt_name: promptName,
    version,
  });

  const handleGenerate = async () => {
    try {
      const result = await generateTests({ prompt_name: promptName, count: 5 }).unwrap();
      toast.success(`Generated ${result.generated} test cases`);
    } catch (error) {
      toast.error("Failed to generate test cases");
    }
  };

  const handleRun = async () => {
    try {
      const result = await runTests({ prompt_name: promptName, version }).unwrap();
      toast.success(
        `Tests completed: ${result.passed}/${result.total} passed (${Math.round(result.success_rate * 100)}%)`
      );
    } catch (error) {
      toast.error("Failed to run tests");
    }
  };

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Test Suite
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Tests
            </Button>
            <Button
              size="sm"
              onClick={handleRun}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Tests
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingResults ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{results.total_runs}</p>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                <p className="text-xs text-success">Passed</p>
                <p className="text-2xl font-bold text-success">{results.passed}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">Failed</p>
                <p className="text-2xl font-bold text-destructive">{results.failed}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(results.success_rate * 100)}%
                </p>
              </div>
            </div>

            {/* Recent Runs */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Recent Test Runs</p>
              {results.runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {run.success ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm text-foreground line-clamp-1">
                        {run.input}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {run.latency_ms}ms
                      </p>
                    </div>
                  </div>
                  <Badge variant={run.success ? "default" : "destructive"}>
                    {run.success ? "Passed" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No test results yet. Generate and run tests to see results.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4. Integration in Prompt Detail Page

En `frontend/src/app/(dashboard)/prompts/[name]/page.tsx`, agregar un nuevo tab:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="versions">Versions</TabsTrigger>
    <TabsTrigger value="tests">Tests</TabsTrigger> {/* NEW */}
  </TabsList>

  {/* ... otros tabs ... */}

  <TabsContent value="tests">
    <TestSuitePanel promptName={promptName} />
  </TabsContent>
</Tabs>
```

---

## Migration

**Archivo**: `backend/migrations/0005_add_test_cases.sql`

```sql
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    input_text TEXT NOT NULL,
    expected_output TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('happy_path', 'edge_case', 'boundary', 'negative')),
    auto_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE test_runs (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE SET NULL,
    input_text TEXT NOT NULL,
    output_text TEXT,
    success BOOLEAN NOT NULL,
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_test_cases_prompt_id ON test_cases(prompt_id);
CREATE INDEX idx_test_runs_prompt_version ON test_runs(prompt_id, version);
CREATE INDEX idx_test_runs_executed_at ON test_runs(executed_at DESC);
```

---

## Checklist

### Backend
- [ ] Crear modelos TestCase y TestRun
- [ ] Implementar TestCaseGenerator service
- [ ] Implementar TestExecutor service
- [ ] Crear endpoints en /tests
- [ ] Aplicar migration 0005
- [ ] Agregar rate limiting para generación de tests

### Frontend
- [ ] Crear types en tests.ts
- [ ] Crear testsApi.ts con RTK Query
- [ ] Crear TestSuitePanel component
- [ ] Integrar en prompt detail page
- [ ] Agregar tab "Tests"
- [ ] UI para ver resultados históricos
- [ ] Comparison view entre versiones

### Testing
- [ ] Probar generación de test cases
- [ ] Probar ejecución de tests
- [ ] Probar comparison entre versiones
- [ ] Verificar rate limiting
- [ ] Probar con prompts complejos

---

## Estimación
**Tiempo total**: 2-3 días (16-24 horas)

- Backend models & migrations: 2 horas
- AI generation service: 4 horas
- Test execution service: 4 horas
- API endpoints: 3 horas
- Frontend types & API: 2 horas
- UI components: 4 horas
- Integration & testing: 3 horas
- Polish & edge cases: 2 horas

---

## Future Enhancements

1. **Visual Regression Testing**: Compare outputs visualmente
2. **Test Coverage Analysis**: Identificar qué casos no están cubiertos
3. **Performance Benchmarking**: Track performance trends over time
4. **Scheduled Tests**: Cron jobs para ejecutar tests automáticamente
5. **Test Templates**: Reutilizar test suites entre prompts similares
6. **AI-Powered Assertions**: Validar outputs automáticamente con LLM
7. **Regression Alerts**: Notificar cuando success rate baja
8. **Test Recommendations**: Sugerir tests basados en uso real

---

## Notas

- **Cost Management**: Cada test ejecuta el LLM, monitorear costos
- **Rate Limiting**: Limitar generación/ejecución por usuario/día
- **Batch Execution**: Ejecutar tests en paralelo cuando sea posible
- **Caching**: Cachear resultados para mismos inputs
- **Async Execution**: Tests largos ejecutar en background
- **Webhooks**: Notificar cuando tests completen (para CI/CD)
