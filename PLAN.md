# PLAN: SQLite Database Migration with SQLAlchemy 2.0 ORM & Alembic

## 1. Goal & Architectural Summary
Migrate AutoTray-Router persistence from browser `localStorage` to **SQLite** using **SQLAlchemy 2.0 ORM** and **Alembic** migrations in the FastAPI backend.
By standardizing on SQLAlchemy 2.0 and configuring the database via `DATABASE_URL` (default: `sqlite:///./autotray.db`), the system can seamlessly switch to PostgreSQL, MySQL, or enterprise databases when integrating with other engineering software.
Full relational normalization ensures that external systems, CAD tools, and scripts can query, insert, or join cables, tray branches, and sizing BOMs directly via SQL.

---

## 2. Steps & Verification Plan

### Step 1: Backend Dependencies & Database Engine Setup
- **Files**: `backend/requirements.txt`, `backend/app/database.py`
- **Actions**:
  - Add `sqlalchemy>=2.0.28` and `alembic>=1.13.1` to `requirements.txt`.
  - Install dependencies into `.venv`.
  - Create `backend/app/database.py` with `DATABASE_URL`, connection engine (`check_same_thread=False` for SQLite), `SessionLocal`, declarative `Base`, and `get_db()` dependency.
- **Proof**: Import `engine` and `get_db` in a Python check script to verify connection to `autotray.db` without errors.

### Step 2: Relational SQLAlchemy Models & Pydantic Schemas
- **Files**: `backend/app/db_models.py`, `backend/app/models.py`
- **Actions**:
  - Define `ProjectModel` (id, name, code, description, timestamps).
  - Define `ProjectParametersModel` (project_id FK, margin, fill %, ODs, JSON custom types).
  - Define `BranchModel` (project_id FK, branch_id, node_from, node_to, level, type, length, height, mounting, weight override).
  - Define `CableModel` (project_id FK, cable_tag, source_node, dest_node, type, od_mm, count, category, formation, panels, weights).
  - Define `NodeFittingModel` (project_id FK, node_id, fitting_type, override, reducers JSON).
  - Define `CableCatalogModel` (code PK, category, voltage, cores, size, OD, weight, ampacity).
  - Define `CalculationResultModel` (project_id FK, calculated_at, summary JSON, branches JSON, cables JSON, BOM JSON).
  - Define corresponding Pydantic request/response schemas in `models.py` (`ProjectCreate`, `ProjectUpdate`, `ProjectSummary`, `ProjectDetail`, `CableCatalogItem`).
- **Proof**: Run `Base.metadata.create_all(bind=engine)` and verify tables are created in SQLite with correct columns, primary keys, and foreign keys.

### Step 3: Database Seeder & CRUD Service Layer
- **Files**: `backend/app/crud.py`, `backend/app/seed.py`
- **Actions**:
  - Implement `seed_cable_catalog(db)` from `LOW_VOLTAGE_CABLE_CATALOG` in `cable_catalog.py`.
  - Implement `seed_demo_project_if_empty(db)` with default sample refinery branches and cables.
  - Implement complete CRUD for projects, branches, cables, parameters, fittings, calculation results, and cable catalog items.
- **Proof**: Automated unit tests testing project creation, retrieval, updates, cascaded deletes, and catalog searches.

### Step 4: FastAPI REST Endpoints & Alembic Setup
- **Files**: `backend/app/main.py`, `backend/alembic.ini`, `backend/alembic/`
- **Actions**:
  - Expose `/api/v1/projects` (GET, POST), `/api/v1/projects/{id}` (GET, PUT, DELETE), `/api/v1/projects/{id}/calculate` (POST).
  - Expose `/api/v1/catalog` (GET, POST).
  - Initialize Alembic environment and generate initial migration revision.
  - Preserve all existing stateless endpoints for backward compatibility.
- **Proof**: Run pytest against all new and existing API endpoints (`pytest tests/test_api.py` and new `tests/test_database_crud.py`).

### Step 5: Frontend API Client & State Storage Integration
- **Files**: `frontend/src/lib/api.ts`, `frontend/src/lib/project-storage.ts`, `frontend/src/app/page.tsx`
- **Actions**:
  - Add typed API methods for project CRUD and calculation in `frontend/src/lib/api.ts`.
  - Update `project-storage.ts` to fetch from and persist to FastAPI backend database with caching of active project ID.
  - Wire `frontend/src/app/page.tsx` to load initial active project from DB, sync modifications, and save calculation results.
- **Proof**:
  - Run frontend test suite (`npm test`) to guarantee zero regression on the 79 existing tests.
  - Create, edit, calculate, and reload a project in the browser to verify full roundtrip SQLite persistence.
