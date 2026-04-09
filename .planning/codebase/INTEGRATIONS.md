# External Integrations

## Database: PostgreSQL

**Connection:**
- Configured in `backend/settings.py` via `DATABASES["default"]`
- Uses `psycopg2-binary` driver
- Connection parameters loaded from `.env` via `python-dotenv`

**Tables (from Django models in `backend/api/models.py`):**
| Table                   | Model                | Purpose                                      |
|-------------------------|----------------------|----------------------------------------------|
| `bridge_analysis_run`   | `BridgeAnalysisRun`  | Stores analysis inputs, results, compliance   |
| `code_compliance_check` | `CodeComplianceCheck` | Individual IS code checks per run             |
| `test_case`             | `TestCase`           | Regression test cases with expected values     |
| `validation_run`        | `ValidationRun`      | Test suite execution records                   |
| `steel_section`         | `SteelSection`       | Steel section library (designation, I, Z, etc) |

## REST API

**Base URL:** `http://127.0.0.1:8000/api/`

**Endpoints (from `backend/api/urls.py`):**
| Method | Path            | View Function | Purpose                              |
|--------|-----------------|---------------|--------------------------------------|
| POST   | `/api/calculate/` | `calculate`   | Backwards-compatible alias for analyze |
| POST   | `/api/analyze/`   | `analyze`     | Full bridge analysis with plots        |
| POST   | `/api/plots/`     | `plots`       | Plots-only response (same input)       |

**Request/Response:**
- Input: JSON body validated by `BridgeAnalysisRequestSerializer`
- Response: `{ status, warnings, data: { inputs_normalized, results_summary, reactions, code_checks, plots } }`
- Plots are returned as Plotly.js-compatible JSON specs (data + layout)

## Frontend → Backend Communication

- **HTTP Client:** `axios` with `Content-Type: application/json`
- **Base URL:** Hardcoded as state: `http://127.0.0.1:8000/api` in `BridgeAnalysisPage.jsx`
- **CORS:** Enabled via `django-cors-headers` middleware for `localhost:3000`

## Client-Side PDF Generation

- **Library:** `jspdf` + `html2canvas`
- **Flow:** Captures each Plotly graph via `html2canvas`, then assembles multi-page PDF with inputs, results, all 6 diagrams, explanations, and IS code compliance summary
- **Trigger:** "Download Report" button in `BridgeAnalysisPage.jsx`

## Local Storage

- `osdag_tour_done` — Onboarding tour completion flag (persisted in `localStorage`)

## External APIs
- **None** — The application is fully self-contained. No external API calls, no authentication providers, no webhooks.

## CI/CD
- **Not configured** — No `.github/workflows`, no CI config files found.

## Management Commands

- `backend/api/management/commands/seed_db.py` — Database seeding command (steel sections, test cases)
