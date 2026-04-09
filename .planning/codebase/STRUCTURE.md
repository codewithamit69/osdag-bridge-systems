# Directory Structure

## Project Root (`osdag-project/`)

```
osdag-project/
├── backend/                        # Django backend (API + solver)
│   ├── .env                        # Database & secret config
│   ├── .gitignore
│   ├── __init__.py
│   ├── manage.py                   # Django management entry point
│   ├── requirements.txt            # Python dependencies
│   ├── settings.py                 # Django settings (DB, CORS, apps)
│   ├── urls.py                     # Root URL config → api/ + admin/
│   ├── asgi.py                     # ASGI application
│   ├── wsgi.py                     # WSGI application
│   │
│   ├── api/                        # Django app: REST endpoints + models
│   │   ├── __init__.py
│   │   ├── admin.py                # Admin registration (empty)
│   │   ├── apps.py                 # App config
│   │   ├── models.py               # 5 Django models + 4 enums (224 lines)
│   │   ├── serializers.py          # DRF request serializer + validation (131 lines)
│   │   ├── urls.py                 # API URL patterns (3 routes)
│   │   ├── views.py                # API views + plot builders (377 lines)
│   │   ├── tests.py                # App-level tests (empty)
│   │   ├── management/
│   │   │   ├── __init__.py
│   │   │   └── commands/
│   │   │       ├── __init__.py
│   │   │       └── seed_db.py      # Database seed command (6509 bytes)
│   │   └── migrations/             # Django migrations
│   │
│   ├── core/                       # Domain logic (pure functions)
│   │   ├── __init__.py
│   │   ├── models.py               # Re-exports from api.models
│   │   ├── solver.py               # Beam analysis engine (184 lines)
│   │   └── validator.py            # Engineering validation rules (37 lines)
│   │
│   └── tests/                      # Pytest test suite
│       ├── conftest.py             # Pytest config (empty)
│       ├── test_solver.py          # Solver unit tests (165 lines, 5 tests)
│       └── data/
│           └── test_data.csv       # CSV test vectors (2 cases)
│
├── bridge-visualizer/              # React frontend SPA
│   ├── .git/                       # Git repository (frontend only)
│   ├── .gitignore
│   ├── README.md
│   ├── package.json                # npm config + dependencies
│   ├── package-lock.json           # Lockfile
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── postcss.config.js           # PostCSS config
│   ├── public/                     # Static assets (CRA public folder)
│   ├── build/                      # Production build output
│   ├── node_modules/               # npm packages
│   │
│   └── src/                        # Source code
│       ├── index.js                # React entry point (ReactDOM.createRoot)
│       ├── index.css               # Global styles + Tailwind directives
│       ├── App.js                  # Root component (renders BridgeAnalysisPage)
│       ├── App.css                 # Legacy CSS design system (432 lines)
│       ├── App.test.js             # CRA default test
│       ├── setupTests.js           # Jest/Testing Library setup
│       ├── reportWebVitals.js      # Web Vitals reporting
│       ├── logo.svg                # CRA logo (unused)
│       │
│       ├── pages/
│       │   └── BridgeAnalysisPage.jsx    # Main page (383 lines) ★
│       │
│       ├── components/
│       │   ├── AnalysisGraphPanel.jsx    # Plotly chart viewer (158 lines) ★
│       │   ├── TopInputToolbar.jsx       # Horizontal input bar (147 lines) ★
│       │   ├── BridgeIllustration.jsx    # SVG beam schematic (67 lines)
│       │   ├── HelpSection.jsx           # Input explanations (162 lines)
│       │   ├── OnboardingTour.jsx        # Guided tour overlay (137 lines)
│       │   ├── InputForm.jsx             # Vertical input form (270 lines) [legacy]
│       │   ├── InteractivePlotExplorer.jsx # Recharts viewer (266 lines) [legacy]
│       │   ├── ResultsDashboard.jsx      # Results panel (162 lines) [legacy]
│       │   ├── PlotCard.jsx              # Single plot card (54 lines) [legacy]
│       │   └── PlotGrid.jsx             # Grid of plots (44 lines) [legacy]
│       │
│       ├── hooks/
│       │   ├── useValidation.js          # Field validation + toasts (80 lines)
│       │   ├── useRecommendations.js     # Smart defaults (55 lines)
│       │   └── useCrossFieldWarnings.js  # Cross-field warnings (42 lines)
│       │
│       └── services/                     # Empty directory (API service planned?)
│
├── db.sqlite3                      # SQLite database file (135KB)
├── docker-compose.yml              # Docker config (empty)
└── manage.py                       # Root manage.py (685 bytes)
```

## Key Locations

| What                        | Where                                           |
|-----------------------------|------------------------------------------------|
| Backend entry point         | `backend/manage.py`                             |
| API views                   | `backend/api/views.py`                          |
| Solver engine               | `backend/core/solver.py`                        |
| Django models               | `backend/api/models.py`                         |
| API serializer              | `backend/api/serializers.py`                    |
| Backend tests               | `backend/tests/test_solver.py`                  |
| Frontend entry point        | `bridge-visualizer/src/index.js`                |
| Main page component         | `bridge-visualizer/src/pages/BridgeAnalysisPage.jsx` |
| Active graph component      | `bridge-visualizer/src/components/AnalysisGraphPanel.jsx` |
| Active input component      | `bridge-visualizer/src/components/TopInputToolbar.jsx` |
| Frontend hooks              | `bridge-visualizer/src/hooks/`                  |
| Global styles               | `bridge-visualizer/src/index.css`               |
| Legacy CSS design system    | `bridge-visualizer/src/App.css`                 |
| Environment config          | `backend/.env`                                  |
| Database config             | `backend/settings.py` (DATABASES)               |

## Naming Conventions

- **Backend files:** snake_case Python modules
- **Frontend components:** PascalCase `.jsx` files
- **Frontend hooks:** camelCase `use*.js` files
- **CSS:** Combination of Tailwind utility classes (inline) and vanilla CSS classes (App.css, index.css)
- **API fields:** snake_case with engineering units as suffix (`span_length_m`, `dead_load_kN_per_m`, `I_m4`)

## Git Configuration
- Git repository is initialized inside `bridge-visualizer/` (frontend only)
- Backend has no `.git/` directory — not independently version controlled
- The root `osdag-project/` has no `.git/` directory
