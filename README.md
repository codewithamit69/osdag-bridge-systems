# OsdagBridge Systems

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![pytest](https://img.shields.io/badge/pytest-FOSSEE--Standard-0A9EDC?style=flat-square&logo=pytest&logoColor=white)](https://pytest.org)
[![IS 800](https://img.shields.io/badge/IS%20800-2007%20Compliant-green?style=flat-square)](https://bis.gov.in)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

> **Mission:** To bring Internship-Level Quality Assurance — the same Test-Driven Development, headless execution, and data-driven validation standards practised by FOSSEE's own selected interns — directly into a production-grade, IS 800:2007 compliant bridge beam analysis system.

---

## Table of Contents

- [What Makes This Different](#what-makes-this-different)
- [System Architecture](#system-architecture)
- [The Zero-Error Pipeline](#the-zero-error-pipeline)
- [FOSSEE-Standard Testing](#fossee-standard-testing)
- [IS 800 Code Compliance](#is-800-code-compliance)
- [Database Design](#database-design)
- [UI/UX Engineering](#uiux-engineering)
- [Quick Start (Docker)](#quick-start-docker)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)

---

## What Makes This Different

Most bridge analysis tools stop at the GUI. OsdagBridge Systems was architected from day one around the exact engineering software quality standards that FOSSEE's own interns are tasked with implementing during their summer fellowship.

| Standard | What FOSSEE Interns Were Tasked With | What OsdagBridge Already Implements |
|---|---|---|
| **Headless Execution** | Bypass PyQt5 GUI via YAML `.osi` input files and CLI | Full REST API — GUI is optional, all logic runs headlessly via Django endpoints |
| **Mocking & Isolation** | `unittest.mock.MagicMock` to fake DB and dropdowns | Django Serializers decouple validation from the solver engine completely |
| **Data-Driven Validation** | `pytest` + Excel benchmark sheets + `pytest.approx()` | `pytest` + PostgreSQL `TestCase` table + per-field tolerance constants |
| **Tolerance Comparisons** | Engineering-grade `pytest.approx()` on SFD, BMD, deflection | `TOLERANCE` dict with separate bounds for shear (0.01 kN), moment (0.05 kN·m), deflection (0.001 mm), stress (0.1 MPa) |
| **UI/UX Modernization** | Redesign PyQt5 layouts to be intuitive and professional | React 18 + Tailwind CSS + Framer Motion + Lucide Icons — built modern from scratch |
| **Schema Quality** | Basic SQLite prototypes | PostgreSQL 16 with JSONB arrays, soft deletes, full audit trail, IS-code enum fields |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│          React 18 + Tailwind CSS + Plotly.js                │
│   Input Form → Validation → Results → Interactive Plots     │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTP / REST (nginx proxy)
┌──────────────────────▼──────────────────────────────────────┐
│                  nginx Reverse Proxy                        │
│        /api/* → Django    /static/* → React build           │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│              Django 4.2 + Django REST Framework             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Serializer │  │  Calculation │  │  Plotly Engine   │   │
│  │  (Hard      │→ │  Engine      │→ │  (SFD/BMD/       │   │
│  │   Blocks)   │  │  (IS 800)    │  │   Deflection/    │   │
│  └─────────────┘  └──────────────┘  │   Stress)        │   │
│                                     └──────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  pytest Suite  ←→  TestCase Table (PostgreSQL)      │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│              PostgreSQL 16 (Docker volume)                  │
│                                                             │
│  bridge_analysis_run  │  code_compliance_check              │
│  test_case            │  validation_run                     │
│  steel_section        │  (all with audit trail)             │
└─────────────────────────────────────────────────────────────┘
```

**Dockerized stack — three containers, one command:**

```
docker compose up -d --build
```

- `db` — PostgreSQL 16 Alpine with health check
- `backend` — Django + Gunicorn (3 workers, auto-migrates on startup)
- `frontend` — React build served by nginx with API proxy

---

## The Zero-Error Pipeline

The core philosophy: **bad inputs never reach the solver.** Validation happens in three independent layers.

### Layer 1 — Frontend (Real-Time, Zero API Calls)

Every field runs `onChange` validation using a `useValidation` hook. Invalid values trigger anchored field-level toast notifications with 200ms fade-in / 300ms fade-out transitions. The Analyze button is hard-disabled when any blocking error is active.

Cross-field warnings are computed client-side before submission:

```javascript
// Estimated stress pre-check (no API call needed)
if ((w * L**2 / 8 * y) / I > 0.9 * fy_map[steelGrade]) {
  setWarning("Estimated stress ratio exceeds 0.9. Section may fail strength check.");
}
if (spanLength > 25 && supportCondition === 'simply_supported') {
  setWarning("Long span: deflection serviceability (L/300) may be critical.");
}
```

### Layer 2 — Django Serializer (Hard Blocks, HTTP 400)

The `BridgeAnalysisSerializer` enforces hard constraints at the API boundary. The solver engine is never called if any of these fail:

```python
HARD_BLOCK_RULES = {
    "span_length":        (1.0,      200.0),     # metres
    "dead_load":          (0.1,      500.0),     # kN/m
    "point_load":         (0.0,      None),      # kN, must be non-negative
    "load_position":      (0.0,      span),      # must be within [0, L]
    "moment_of_inertia":  (1e-8,     1.0),       # m⁴, zero causes division error
    "youngs_modulus":     (190.0,    210.0),     # GPa, ±5% of 200 GPa per IS 800
    "impact_factor":      (0.0,      0.5),       # IS 800 maximum
    "section_y":          (0.0001,   None),      # must be positive
    "plot_points":        (50,       100),       # performance bound
}
```

Cross-field checks also run at serializer level — `load_position` is validated against the submitted `span_length`, not a fixed constant.

### Layer 3 — Calculation Engine (Stress and Serviceability Guards)

Even after passing the serializer, the solver applies IS 800 safety checks before returning results:

```python
# Strength check — IS 800 Cl.8.2
if sigma_max > 0.9 * fy:
    return HTTP_400 with stress_ratio, sigma_max, fy

# Serviceability check — IS 800 Cl.5.6.1
deflection_limit = span_length / 300
if delta_max > deflection_limit:
    response["warnings"].append(f"Deflection {delta_max:.3f}mm exceeds L/300 = {deflection_limit:.3f}mm")
```

### Input Validation Matrix

| Parameter | Hard Block Range | Tolerance | Reject Condition |
|---|---|---|---|
| Span Length | 1 m – 200 m | ±0.001 m | ≤ 0 or > 200 |
| Dead Load (UDL) | 0.1 – 500 kN/m | ±0.01 kN/m | ≤ 0 or > 500 |
| Point Load | ≥ 0 kN | ±0.1 kN | < 0 |
| Load Position x | 0 ≤ x ≤ L | ±0.001 m | Outside [0, L] |
| Impact Factor | 0.0 – 0.5 | ±0.001 | > 0.5 (clamped + warned) |
| Young's Modulus E | 190 – 210 GPa | ±0.5 GPa | Outside ±5% of 200 GPa |
| Moment of Inertia I | 1×10⁻⁸ – 1.0 m⁴ | ±1×10⁻¹⁰ m⁴ | ≤ 0 (division by zero) |
| Section y | > 0 m | ±0.0001 m | ≤ 0 |
| Plot Points | 50 – 100 | — | Outside [50, 100] |

---

## FOSSEE-Standard Testing

This is the exact testing methodology that FOSSEE interns spend their summer implementing. It is built in from day one here.

### Tolerance Constants

```python
# backend/core/tests/tolerance.py
TOLERANCE = {
    "shear_force":      0.01,    # kN   — 1% of typical values
    "bending_moment":   0.05,    # kN·m
    "deflection":       0.001,   # mm
    "normal_stress":    0.1,     # MPa
    "shear_stress":     0.05,    # MPa
    "reaction":         0.01,    # kN
}
```

### Data-Driven Test Cases (PostgreSQL-Backed)

Test cases live in the `test_case` table — not in Excel files, not hardcoded in Python. Each row stores inputs, hand-calculated expected outputs, and per-field tolerance overrides:

```python
# backend/core/tests/test_engine.py
import pytest
from core.models import TestCase
from core.engine import run_analysis

@pytest.mark.django_db
class TestBridgeEngine:

    def test_all_stored_cases(self):
        """
        Data-driven: runs every active TestCase from PostgreSQL
        and asserts computed == expected within FOSSEE tolerances.
        """
        for tc in TestCase.objects.filter(is_active=True):
            result = run_analysis(tc.to_input_dict())

            assert result["max_shear_force"] == pytest.approx(
                float(tc.expected_max_shear), abs=float(tc.tol_shear)
            ), f"[{tc.case_id}] Shear mismatch"

            assert result["max_bending_moment"] == pytest.approx(
                float(tc.expected_max_moment), abs=float(tc.tol_moment)
            ), f"[{tc.case_id}] Moment mismatch"

            assert result["max_deflection"] == pytest.approx(
                float(tc.expected_max_deflection), abs=float(tc.tol_deflection)
            ), f"[{tc.case_id}] Deflection mismatch"

            assert result["max_normal_stress"] == pytest.approx(
                float(tc.expected_max_stress), abs=float(tc.tol_stress)
            ), f"[{tc.case_id}] Stress mismatch"
```

### Headless Execution (No GUI Required)

The entire calculation pipeline runs without the React frontend. The Django REST API is the headless interface — equivalent to FOSSEE's YAML `.osi` CLI approach:

```bash
# Run a full analysis headlessly via curl
curl -X POST http://localhost:8000/api/v1/analyze/ \
  -H "Content-Type: application/json" \
  -d '{
    "span_length": 20.0,
    "dead_load": 5.0,
    "point_load": 50.0,
    "load_position": 10.0,
    "steel_grade": "Fe415",
    "youngs_modulus": 200.0,
    "moment_of_inertia": 0.0002,
    "section_y": 0.25,
    "impact_factor": 0.1,
    "plot_points": 99
  }'
```

### Mocking and Isolation

The solver engine is fully decoupled from the database, serializer, and HTTP layer. It can be tested in isolation with plain Python dicts:

```python
# engine is a pure function — no DB, no HTTP, no GUI
from core.engine import run_analysis
from unittest.mock import patch

def test_engine_isolated():
    """Solver tested with zero database or HTTP involvement."""
    with patch('core.engine.get_section_properties') as mock_section:
        mock_section.return_value = {"I": 0.0002, "y": 0.25}
        result = run_analysis({"span_length": 20.0, "dead_load": 5.0, ...})
        assert result["max_bending_moment"] == pytest.approx(437.5, abs=0.05)
```

### Run the Full Test Suite

```bash
# Inside the running backend container
docker compose exec backend pytest backend/core/tests/ -v --tb=short

# Or locally with virtualenv
cd backend
pytest core/tests/ -v --tb=short
```

### Live Test Suite API Endpoint

The test suite can also be triggered via the UI or API — results are stored in the `validation_run` table:

```bash
curl -X POST http://localhost:8000/api/v1/testcases/run/ \
  -H "Content-Type: application/json" \
  -d '{"test_suite": "all"}'
```

Response:
```json
{
  "passed": 14,
  "failed": 0,
  "pass_rate": 100.0,
  "duration_ms": 312,
  "results": [
    {
      "case_id": "TC_001",
      "description": "20m span, UDL 15 kN/m, simply supported",
      "status": "PASS",
      "computed": {"max_moment": 750.0, "max_deflection": 8.2},
      "expected": {"max_moment": 750.0, "max_deflection": 8.2},
      "tolerance": {"bending_moment": 0.05, "deflection": 0.001}
    }
  ]
}
```

---

## IS 800 Code Compliance

Every analysis run produces three IS code compliance checks, stored in the `code_compliance_check` table and returned in the API response:

| Check | Clause | Formula | Limit |
|---|---|---|---|
| Deflection | IS 800 Cl.5.6.1 | δ_max | L / 300 |
| Bending Stress | IS 800 Cl.8.2 | σ = M·y/I | 0.9 × fy |
| Shear Stress | IS 800 Cl.8.4 | τ = V·Q/(I·b) | 0.6 × fy |

Steel grade yield strengths (IS 800:2007 Table 1):

| Grade | fy (MPa) | 0.9fy (MPa) | 0.6fy (MPa) |
|---|---|---|---|
| Fe250 | 250 | 225 | 150 |
| Fe350 | 350 | 315 | 210 |
| Fe415 | 415 | 373.5 | 249 |
| Fe500 | 500 | 450 | 300 |
| Fe550 | 550 | 495 | 330 |

IRC live load classes supported: AA, A, 70R, SV, Pedestrian.

---

## Database Design

PostgreSQL 16 with production-grade schema patterns — not SQLite, not a prototype.

### Schema Highlights

**`bridge_analysis_run`** — core table, one row per user submission:
- All input fields with `MinValueValidator` / `MaxValueValidator` at the ORM level
- `plot_data` as `JSONField` (PostgreSQL JSONB) storing all six plot arrays in one column — no row-per-point anti-pattern
- `session_id` UUID linking frontend state, API response, and PDF report
- `compliance_status` enum with `db_index=True` for fast historical filtering
- `is_deleted` soft-delete flag on every table via `AuditableModel` abstract base

**JSONB plot_data schema:**
```json
{
  "x": [0.0, 0.2, 0.4, "..."],
  "sfd": [80.0, 79.6, "..."],
  "bmd": [0.0, 16.0, "..."],
  "deflection": [0.0, -0.01, "..."],
  "normal_stress": [0.0, 1.2, "..."],
  "shear_stress": [18.1, 17.9, "..."],
  "load_vs_deflection": {
    "multipliers": [0.1, 0.2, "..."],
    "deflections": [0.6, 1.2, "..."]
  }
}
```

**`test_case`** — PostgreSQL-backed test data (replaces Excel benchmark files):
- Stores inputs + hand-calculated expected outputs + per-field tolerances
- Seeded via `python manage.py seed_db`
- Queried live by the pytest suite — single source of truth

**`code_compliance_check`** — one row per IS clause per run, with computed value, limit, unit, and PASS/FAIL.

**`validation_run`** — records every pytest execution with `results_payload` JSONB and `pass_rate`.

**`steel_section`** — read-only lookup table for IS 808 sections (ISMB 200 through ISMB 600).

### Composite Indexes

```python
indexes = [
    models.Index(fields=['compliance_status', 'created_at']),  # historical queries
    models.Index(fields=['steel_grade', 'span_length']),        # engineering queries
]
```

---

## UI/UX Engineering

The React frontend was designed to solve the exact UX problems that FOSSEE interns (particularly Anushka Bajpai) were assigned to fix in the legacy PyQt5 interface.

### Key UI Features

**Onboarding Tour** — 8-step guided overlay on first visit (stored in `localStorage`). Highlights each UI region with a cutout mask and tooltip. Replayable via floating `?` button.

**Real-Time Smart Validation** — `useValidation` hook runs on every `onChange` event. Anchored field-level toast notifications with fade transitions (200ms in, 300ms out, 3s hold). Zero API calls for validation.

**Ghost Recommendations** — `useRecommendations` hook computes recommended values for dependent fields (e.g. optimal `I` from span and serviceability limit) shown as translucent placeholder text. Tab-to-accept.

**Six Interactive Plots** — Shear Force, Bending Moment, Deflection, Normal Stress, Shear Stress, Load vs Deflection. Each with hover tooltips, annotated peak values, IS 800 reference lines, and color-coded compliance regions.

**Graph Explanation Panel** — Below each plot, a collapsible panel explains what the diagram means using computed values. Every sentence uses actual analysis results, not template filler.

**Dark / Light Mode** — Full CSS variable theming with `localStorage` persistence and smooth 0.3s transition. Plotly graphs theme-aware via computed CSS variable injection.

**Downloadable PDF Report** — 10-page report generated client-side: cover page, input summary table, results summary, one page per diagram (graph image + explanation), IS code compliance summary. Uses `jsPDF` + `html2canvas` with Unicode sanitization and `splitTextToSize` word-wrapping.

---

## Quick Start (Docker)

### Prerequisites

- Docker Desktop installed and running
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/osdag-bridge-systems.git
cd osdag-bridge-systems
```

### 2. Create your environment file

```bash
# Create .env at project root
cat > .env << EOF
DB_NAME=osdag_database_library
DB_USER=osdag_project_bridgeanalysis
DB_PASSWORD=your_secure_password_here
DB_HOST=db
DB_PORT=5432
SECRET_KEY=your-django-secret-key-here
DEBUG=False
EOF
```

### 3. Build and start all containers

```bash
docker compose up -d --build
```

This starts three containers in order:
1. PostgreSQL 16 (waits for health check)
2. Django + Gunicorn (auto-runs `migrate` on startup)
3. React + nginx (proxies `/api/` to Django)

First build: ~5 minutes. Subsequent builds: ~60 seconds.

### 4. Seed the database

```bash
# Load IS 808 steel sections and benchmark test cases
docker compose exec backend python manage.py seed_db
```

### 5. Verify everything is running

```bash
docker compose ps
```

All three services should show `running`. Then:

```bash
# Health check
curl http://localhost:8000/api/health/
# Expected: {"status": "ok"}
```

### 6. Open the app

```
http://localhost:3000
```

### Common Commands

```bash
# View logs
docker compose logs -f backend

# Run test suite
docker compose exec backend pytest backend/core/tests/ -v

# Run headless analysis
docker compose exec backend python manage.py shell

# Stop everything
docker compose down

# Full reset (deletes database volume)
docker compose down -v
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health/` | Health check — confirms backend is live |
| `POST` | `/api/v1/validate/` | Validate inputs only, no calculation |
| `POST` | `/api/v1/analyze/` | Full analysis pipeline, returns results + session_id |
| `POST` | `/api/v1/plots/` | Generate all six Plotly plot JSONs for a session |
| `GET` | `/api/v1/sections/` | List available IS 808 steel sections |
| `GET` | `/api/v1/history/` | List past analysis runs |
| `GET` | `/api/v1/history/<uuid>/` | Full inputs + results for one run |
| `POST` | `/api/v1/testcases/run/` | Trigger pytest validation suite |

---

## Project Structure

```
osdag-bridge-systems/
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
├── .env                          ← not committed to git
├── manage.py
│
├── backend/
│   ├── requirements.txt
│   ├── backend/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── core/
│       ├── models.py             ← 5-table schema with AuditableModel
│       ├── serializers.py        ← hard-block validation layer
│       ├── engine.py             ← pure calculation functions (IS 800)
│       ├── views.py              ← DRF API views
│       ├── urls.py
│       ├── management/
│       │   └── commands/
│       │       └── seed_db.py    ← seeds sections + test cases
│       └── tests/
│           ├── tolerance.py      ← TOLERANCE constants
│           ├── test_engine.py    ← data-driven pytest suite
│           ├── test_validation.py
│           └── test_api.py
│
└── bridge-visualizer/            ← React app
    ├── package.json
    └── src/
        ├── components/
        │   ├── InputToolbar.jsx
        │   ├── ActionBar.jsx
        │   ├── SystemOverview.jsx
        │   ├── PlotPanel.jsx
        │   ├── ExplanationPanel.jsx
        │   ├── ComplianceBadges.jsx
        │   ├── OnboardingTour.jsx
        │   └── ReportGenerator.jsx
        └── hooks/
            ├── useValidation.js
            ├── useRecommendations.js
            └── useCrossFieldWarnings.js
```

---

## Roadmap

- [ ] Add continuous beam (multi-span) support
- [ ] IRC moving load influence line diagrams
- [ ] IS 456:2000 reinforced concrete beam analysis
- [ ] Export test cases to CSV for offline benchmark comparison
- [ ] GitHub Actions CI pipeline running pytest on every push

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for the FOSSEE Summer Fellowship — IITB**

*Demonstrating that the quality standards taught during the internship can be the foundation, not the destination.*

</div>
