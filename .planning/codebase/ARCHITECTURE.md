# Architecture

## High-Level Pattern

**Client-Server SPA** — Decoupled React frontend communicating with a Django REST API backend over HTTP/JSON.

```
┌─────────────────────────┐          HTTP POST (JSON)          ┌─────────────────────────┐
│   React SPA (CRA)       │  ──────────────────────────────▶   │   Django REST API       │
│   localhost:3000         │  ◀──────────────────────────────   │   localhost:8000        │
│                          │     JSON response (plots, data)   │                          │
│  ┌─────────────────┐     │                                   │  ┌─────────────────┐     │
│  │ BridgeAnalysis   │    │                                   │  │ Serializer      │     │
│  │ Page (container) │    │                                   │  │ (validation)    │     │
│  │    ↓             │    │                                   │  │    ↓             │    │
│  │ TopInputToolbar  │    │                                   │  │ Validator       │     │
│  │ AnalysisGraph    │    │                                   │  │ (engineering)   │     │
│  │ HelpSection      │    │                                   │  │    ↓             │    │
│  │ OnboardingTour   │    │                                   │  │ Solver          │     │
│  └─────────────────┘     │                                   │  │ (beam analysis) │     │
│                          │                                   │  │    ↓             │    │
│  Hooks:                  │                                   │  │ View (response  │     │
│  useValidation           │                                   │  │  builder + plots)│    │
│  useRecommendations      │                                   │  └─────────────────┘     │
│  useCrossFieldWarnings   │                                   │                          │
└─────────────────────────┘                                   └──────────┬──────────────┘
                                                                         │
                                                                         ▼
                                                              ┌─────────────────────┐
                                                              │   PostgreSQL DB      │
                                                              │   (osdag_database)   │
                                                              └─────────────────────┘
```

## Backend Layers

### 1. API Layer (`backend/api/`)
- **Serializers** (`serializers.py`) — DRF serializers with field-level + cross-field validation. Handles type coercion, range checks, and auto-clamping (e.g., impact_factor > 0.5 → clamped with warning).
- **Views** (`views.py`) — Function-based views (`@api_view`). Two endpoints: `analyze` (full response) and `plots` (plots only). Both share `_analyze_payload()` internal function.
- **URL routing** (`urls.py`) — Three routes mapping to two distinct view functions plus a backwards-compatible alias (`calculate` = `analyze`).
- **Models** (`models.py`) — 5 Django models with enums, validators, and composite indexes. Includes `AuditableModel` abstract base (created_at, updated_at, soft-delete).

### 2. Core/Domain Layer (`backend/core/`)
- **Solver** (`solver.py`) — Pure function `analyze_simply_supported_udl_point_load()` implementing beam mechanics via superposition (UDL + point load). Uses Python `Decimal` for precision. Returns plot-ready arrays for SFD, BMD, deflection, stress, shear stress.
- **Validator** (`validator.py`) — Non-blocking engineering rules that produce warnings (e.g., span > 25m serviceability hint). Hard blocks are handled by the serializer layer.
- **Models proxy** (`models.py`) — Re-exports all models from `backend.api.models` for import convenience.

### 3. Data Flow (Request Lifecycle)

```
POST /api/analyze/
    → BridgeAnalysisRequestSerializer.is_valid()     # DRF validation + warnings
    → apply_validation_rules(inputs)                  # Engineering warnings
    → analyze_simply_supported_udl_point_load(...)    # Core solver
    → _build_plots(inputs, result, fy, stress_ratio)  # Plotly JSON specs
    → _build_load_vs_deflection_plot(inputs)          # Parametric sweep (20 runs)
    → Response({status, warnings, data})              # JSON response
```

**Key design decision:** The `load_vs_deflection` plot runs the solver 20 times with load multipliers 0.1–2.0. This is the most expensive operation per request.

## Frontend Layers

### 1. Page Layer (`src/pages/`)
- **BridgeAnalysisPage.jsx** (383 lines) — Single page container. Manages all state (form data, API results, UI toggles). Handles API calls, PDF generation, and auto-run on mount.

### 2. Component Layer (`src/components/`)
- **TopInputToolbar** — Horizontal scrollable input bar with 10 fields, real-time validation toasts, recommendations
- **AnalysisGraphPanel** — Plotly graph viewer with dropdown selector, peak annotations, stats badges. Uses `forwardRef` + `useImperativeHandle` for PDF capture.
- **BridgeIllustration** — SVG schematic (UDL arrows, point load, supports, axis)
- **HelpSection** — Input field explanations with animated highlight scrolling
- **OnboardingTour** — Multi-step guided tour with spotlight overlay
- **InputForm** — Original vertical form layout (still present but superseded by TopInputToolbar)
- **InteractivePlotExplorer** — Recharts-based alternative viewer with client-side math engine (not connected to API, uses local formulas)
- **PlotCard / PlotGrid** — Earlier iteration grid-based plot layout (superseded by AnalysisGraphPanel)
- **ResultsDashboard** — Earlier iteration results panel (superseded by BridgeAnalysisPage inline layout)

### 3. Hook Layer (`src/hooks/`)
- **useValidation** — Real-time field validation with toast-based error display and hard-block detection
- **useRecommendations** — Computes recommended values (e.g., load position = L/2, recommended I for serviceability)
- **useCrossFieldWarnings** — Cross-field warnings (e.g., estimated stress > 0.9fy)

## Key Abstractions

### Solver Contract
The solver function is a pure function with no side effects:
```python
def analyze_simply_supported_udl_point_load(
    *, span_length_m, dead_load_kN_per_m, point_load_kN,
    load_position_m, impact_factor, E_GPa, I_m4, section_y_m, n_points
) -> dict  # Returns: x_m, sfd_kN, bmd_kNm, deflection_mm, stress_MPa, shear_stress_MPa, reactions_kN, maxima
```

### Plot Contract
Each plot is a Plotly spec: `{ plotly: { data: [...traces], layout: {...} } }`. Six plot types: `shear_force`, `bending_moment`, `deflection`, `normal_stress`, `shear_stress`, `load_vs_deflection`.

### Validation Layers
1. **Frontend hook validation** (instant, client-side) → toasts
2. **DRF serializer validation** (server-side, hard blocks) → 400 errors
3. **Engineering validator** (server-side, soft warnings) → warning array in response

## Entry Points
- **Backend:** `python manage.py runserver` (from `backend/` directory)
- **Frontend:** `npm start` (from `bridge-visualizer/` directory)
- **Tests:** `pytest` (from `backend/` directory)
