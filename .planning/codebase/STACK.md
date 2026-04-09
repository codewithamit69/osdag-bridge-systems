# Technology Stack

## Languages

| Language   | Version   | Usage                          |
|------------|-----------|--------------------------------|
| Python     | 3.x       | Backend API, solver engine     |
| JavaScript | ES2020+   | Frontend React SPA             |
| CSS        | 3 + TW    | Styling (Tailwind + vanilla)   |
| HTML       | 5         | Template markup                |

## Runtime & Frameworks

### Backend
- **Django 6.0** — Web framework (`backend/settings.py`)
- **Django REST Framework** — API layer (`rest_framework` in INSTALLED_APPS)
- **ASGI/WSGI** — Dual support (`backend/asgi.py`, `backend/wsgi.py`)
- **Python `decimal` module** — High-precision arithmetic in solver (50-digit precision via `getcontext().prec = 50`)

### Frontend
- **React 19.2** — UI library (`react@^19.2.4`)
- **Create React App** — Build toolchain (`react-scripts@^5.0.1`)
- **Tailwind CSS 3.4** — Utility-first CSS (`tailwindcss@^3.4.17`)
- **PostCSS + Autoprefixer** — CSS processing pipeline

## Key Dependencies

### Backend (`backend/requirements.txt`)
| Package            | Purpose                              |
|--------------------|--------------------------------------|
| `django>=5.0`      | Web framework                        |
| `djangorestframework` | REST API serializers & views      |
| `django-cors-headers` | CORS handling for frontend dev    |
| `psycopg2-binary`  | PostgreSQL driver                    |
| `python-dotenv`    | Environment variable loading         |
| `pandas`           | Data manipulation (declared, not used in current code) |
| `numpy`            | Numerical computing (declared, not used in current code) |
| `pytest`           | Test framework                       |
| `pytest-django`    | Django test integration              |

### Frontend (`bridge-visualizer/package.json`)
| Package            | Purpose                              |
|--------------------|--------------------------------------|
| `axios@^1.14.0`    | HTTP client for API calls            |
| `plotly.js@^3.5.0` | Interactive scientific charts        |
| `react-plotly.js@^2.6.0` | React wrapper for Plotly        |
| `recharts@^3.8.1`  | Alternative charting (InteractivePlotExplorer) |
| `framer-motion@^12.38.0` | Animations & transitions       |
| `lucide-react@^1.7.0` | Icon library                      |
| `jspdf@^4.2.1`     | Client-side PDF generation           |
| `html2canvas@^1.4.1` | DOM-to-canvas for PDF screenshots  |

## Database
- **PostgreSQL** — Primary database via `psycopg2-binary`
- **SQLite** — Fallback (`db.sqlite3` present at project root)
- Connection config via `.env`: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

## Configuration

### Environment Variables (`backend/.env`)
```
DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
SECRET_KEY
DEBUG
```

### Build Configuration
- `tailwind.config.js` — Content scanning for `./src/**/*.{js,jsx,ts,tsx}`
- `postcss.config.js` — Tailwind + Autoprefixer pipeline
- `react-scripts` for CRA build system

### Dev Server Ports
- **Backend**: `http://127.0.0.1:8000` (Django)
- **Frontend**: `http://localhost:3000` (CRA dev server)
- **CORS**: Configured in `settings.py` for `localhost:3000` and `127.0.0.1:3000`

## Docker
- `docker-compose.yml` exists but is **empty** — Docker setup not yet implemented.
