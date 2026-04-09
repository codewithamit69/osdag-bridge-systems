# Code Conventions

## Backend (Python/Django)

### Code Style
- **No linter config** — No `.flake8`, `pyproject.toml[tool.ruff]`, or similar detected
- **Type hints** — Used extensively in solver and serializer (Python 3.10+ `float | Decimal`, `list[float]`, `dict[str, Any]`)
- **Docstrings** — Present in solver main function; sparse elsewhere
- **Line length** — Unconstrained; some lines in `views.py` exceed 140 chars
- **Imports** — Standard grouping (stdlib → django → local), no `isort` config

### Naming Patterns
```python
# Functions: snake_case, private prefixed with underscore
def _argmax_abs(values: list[float]) -> int: ...
def _build_plots(inputs, result, fy, stress_ratio): ...
def analyze_simply_supported_udl_point_load(...): ...

# Models: PascalCase with descriptive names
class BridgeAnalysisRun(AuditableModel): ...
class CodeComplianceCheck(AuditableModel): ...

# Enums: PascalCase classes with UPPER_SNAKE values
class SteelGrade(models.TextChoices):
    FE250 = "Fe250", "Fe250 (fy=250 MPa)"

# Constants: UPPER_SNAKE_CASE
STEEL_GRADE_TO_FY_MPA: dict[str, Decimal] = { ... }
```

### API Design Patterns
- **Function-based views** with `@api_view` decorator (not class-based)
- **Single serializer** for both `analyze` and `plots` endpoints
- **Warning accumulation** — Serializer and validator each return warnings; merged in view
- **Backwards compatibility** — `calculate = analyze` alias at module level; `generate_bridge_response` wrapper in solver

### Error Handling
```python
# Views catch ValidationError and generic Exception separately
try:
    serializer.is_valid(raise_exception=True)
    ...
except ValidationError as e:
    return Response({"status": "error", "message": "Validation error", "field_errors": e.detail}, status=400)
except Exception as e:
    return Response({"status": "error", "message": str(e)}, status=400)
```

### Decimal Precision Pattern
```python
# Solver uses high-precision Decimal throughout
getcontext().prec = 50

def _d(x: Any) -> Decimal:
    return x if isinstance(x, Decimal) else Decimal(str(x))

# Converts to float only at the return boundary
return {"x_m": [float(x) for x in xs], ...}
```

### Model Patterns
- **Abstract base model** (`AuditableModel`) with `created_at`, `updated_at`, `is_deleted`
- **UUID session IDs** for analysis runs
- **Composite DB indexes** for common query patterns
- **Soft-delete** via `is_deleted` boolean (not enforced by manager)
- **Explicit `db_table`** naming on all models

## Frontend (JavaScript/React)

### Code Style
- **ESLint** — CRA default config (`react-app` + `react-app/jest`)
- **No Prettier** config detected
- **No TypeScript** — Pure JavaScript with JSX

### Component Patterns
```jsx
// Named exports for components (not default)
export function TopInputToolbar({ formData, setField, onSubmit, ... }) { ... }

// Default export for page components
export default function BridgeAnalysisPage() { ... }

// forwardRef for imperative handle components
export const AnalysisGraphPanel = forwardRef(function AnalysisGraphPanel(props, ref) { ... });

// React.memo for pure display components
export const PlotCard = React.memo(function PlotCard({ title, plotlySpec }) { ... });
```

### Hook Patterns
```jsx
// Custom hooks return objects with clear contracts
export function useValidation(formData) {
  return { fieldErrors, toasts, hardBlock, validateAndToast };
}

// useMemo for derived computations
export function useRecommendations(formData) {
  return useMemo(() => { ... }, [formData]);
}
```

### State Management
- **No global state** — All state lives in `BridgeAnalysisPage` and is passed via props
- **Single source of truth** — `formData` object with string values, converted to numbers via `toNumberOrNull()` utility
- **Refs** for DOM manipulation and timers (`graphRef`, `inputBarRef`, `highlightTimerRef`)

### Styling Approach
- **Tailwind utility classes** — Primary styling method (inline in JSX)
- **App.css** — Legacy design system CSS (432 lines) with CSS custom properties (not actively used by current active components)
- **index.css** — Minimal global polish + Tailwind directives + custom scrollbar + reduced-motion support

### Animation Pattern
```jsx
// Framer Motion for page-level animations
import { motion, useReducedMotion } from "framer-motion";
const prefersReducedMotion = useReducedMotion();

// Conditional animation based on user preference
initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
```

### Plotly Integration Pattern
```jsx
// Lazy-loaded to improve initial bundle size
const Plot = React.lazy(() => import("react-plotly.js"));

// Wrapped in Suspense with skeleton fallback
<Suspense fallback={<div className="animate-pulse ..." />}>
  <Plot data={...} layout={...} />
</Suspense>
```
