# Concerns

## Technical Debt

### 1. Legacy / Dead Components (Medium Priority)
Several frontend components are superseded but still present in the codebase:

| File                          | Status    | Replaced By                     |
|-------------------------------|-----------|----------------------------------|
| `InputForm.jsx` (270 lines)  | Legacy    | `TopInputToolbar.jsx`            |
| `ResultsDashboard.jsx` (162) | Legacy    | Inline layout in `BridgeAnalysisPage` |
| `InteractivePlotExplorer.jsx` (266) | Legacy | `AnalysisGraphPanel.jsx`    |
| `PlotCard.jsx` (54)          | Legacy    | `AnalysisGraphPanel.jsx`         |
| `PlotGrid.jsx` (44)          | Legacy    | `AnalysisGraphPanel.jsx`         |
| `App.css` (432 lines)        | Legacy    | Tailwind utility classes         |

**Impact:** ~1,228 lines of dead code adding confusion and maintenance burden.

### 2. Dual Charting Libraries (Low Priority)
- `plotly.js` + `react-plotly.js` — Used by the active `AnalysisGraphPanel`
- `recharts` — Used only by the legacy `InteractivePlotExplorer`
- **Impact:** ~500KB unnecessary bundle size from `recharts` if legacy component is removed.

### 3. Empty/Stub Files
- `backend/api/admin.py` — Empty admin registration
- `backend/api/tests.py` — Empty test file (tests are in `backend/tests/`)
- `backend/tests/conftest.py` — Empty conftest
- `bridge-visualizer/src/services/` — Empty directory
- `docker-compose.yml` — Empty file

### 4. Hardcoded API URL
```jsx
// BridgeAnalysisPage.jsx, line 43
const [apiBaseUrl] = useState("http://127.0.0.1:8000/api");
```
Not configurable via environment variable. The `InputForm.jsx` (legacy) had an editable API URL field, but the current `TopInputToolbar` does not.

### 5. Missing `DEFAULT_AUTO_FIELD` Setting
Django settings don't specify `DEFAULT_AUTO_FIELD` — will default to `AutoField` (integer) instead of `BigAutoField`. Should add `DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'` to `settings.py`.

## Security Concerns

### 1. Credentials in `.env` File (High Priority)
- `backend/.env` contains database password in plaintext: `DB_PASSWORD=Saiamit@036`
- `.env` is listed in `.gitignore` (good), but it's present in the workspace
- `SECRET_KEY` is set to placeholder value `your-django-secret-key-here`

### 2. Debug Mode Enabled
```python
# settings.py line 30
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
```
- Default is `True` — if `DEBUG` env var is not set, debug mode is on
- `ALLOWED_HOSTS = []` — empty, which only works when `DEBUG=True`

### 3. No Authentication
- All API endpoints are unauthenticated — anyone can POST to `/api/analyze/`
- No rate limiting configured
- No CSRF enforcement on API views (DRF `@api_view` exempts CSRF by default)

### 4. CORS Configuration
```python
CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
```
- Only development origins — correct for dev, needs update for production

## Performance Concerns

### 1. Load vs Deflection Plot — 20x Solver Calls
```python
# views.py, _build_load_vs_deflection_plot()
for i in range(1, 21):
    sweep = analyze_simply_supported_udl_point_load(...)
```
Each `/api/analyze/` request runs the solver **21 times** (1 primary + 20 sweep). With `n_points=101` and `Decimal` arithmetic at 50-digit precision, this is computationally expensive.

### 2. Plotly.js Bundle Size
- `plotly.js@^3.5.0` is ~3.5MB minified — largest dependency by far
- Lazy-loaded via `React.lazy()` (good), but still downloads on first chart render
- Consider using `plotly.js-basic-dist` or `plotly.js-dist-min` for smaller bundle

### 3. No Caching
- No server-side caching for identical analysis requests
- No frontend memoization of API responses
- Re-analyzing with same inputs makes a fresh API call + 21 solver runs

## Architecture Concerns

### 1. Monolithic Page Component
- `BridgeAnalysisPage.jsx` (383 lines) manages ALL state: form data, API responses, loading, errors, warnings, PDF generation, viewport tracking, auto-run
- Should be decomposed: extract API logic into a custom hook (`useBridgeAnalysis`), extract PDF logic into a utility

### 2. Models Defined but DB Not Used by Views
- 5 Django models exist (`BridgeAnalysisRun`, `CodeComplianceCheck`, `TestCase`, `ValidationRun`, `SteelSection`)
- The API views **do not save** any data to the database — they compute and return results statelessly
- Models appear to be designed for future persistence but are currently unused by the API

### 3. No Router
- Frontend is a single-page app with no routing (`react-router` not installed)
- Only one page (`BridgeAnalysisPage`) — acceptable for now but will need routing if more pages are added

### 4. Git Repository Split
- Git `.git/` is only inside `bridge-visualizer/`
- Backend has no version control
- Ideally the root `osdag-project/` should have a single Git repository covering both

## Fragile Areas

### 1. Backwards Compatibility Aliases
- `calculate = analyze` in `views.py` — If `analyze` signature changes, `calculate` silently breaks
- `generate_bridge_response` in `solver.py` — Wrapper with different parameter names, fixed defaults

### 2. Impact Factor Clamping Inconsistency
- Serializer clamps impact_factor > 0.5 to 0.5 **silently with warning**
- Frontend also clamps in `buildPayload()`: `Math.min(0.5, Math.max(0, ...))`
- Validation hook flags it as a warning toast
- Three places doing the same clamping logic independently

### 3. n_points Validation Mismatch
- Serializer: `min_value=50, max_value=100` (contradicts `default=101`)
- Model: `default=99, validators=[MinValueValidator(50), MaxValueValidator(100)]`
- Frontend default: `n_points: "99"`
- The serializer default of 101 exceeds its own max_value constraint
