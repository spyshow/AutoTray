from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal, get_db
from .db_models import *  # Ensure all models are registered with Base.metadata
from .models import (
    CalculationRequest,
    CalculationResponse,
    ProjectCreate,
    ProjectUpdate,
    ProjectSummary,
    ProjectDetail,
    CableCatalogItem,
)
from .seed import seed_cable_catalog, seed_demo_project_if_empty
from .crud import (
    get_projects,
    get_project,
    create_project,
    update_project,
    delete_project,
    save_project_calculation,
    get_cable_catalog,
    add_cable_to_catalog,
)
from .routing_engine import solve_routing_and_sizing
from .excel_exporter import generate_excel_report
from .sample_generator import generate_sample_excel_workbook


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default catalog & demo project
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_cable_catalog(db)
        seed_demo_project_if_empty(db)
    finally:
        db.close()
    yield
    # Shutdown


app = FastAPI(
    title="AutoTray-Router: Industrial Cable Tray & Multi-Level Riser Sizing Engine",
    version="1.0.0",
    description="High-performance cable tray sizing and multi-level riser routing API with SQLite/PostgreSQL ORM and OpenPyXL.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "engine": "AutoTray-Router",
        "status": "online",
        "version": "1.0.0",
        "database": "SQLAlchemy 2.0 ORM",
        "docs_url": "/docs",
    }


@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "service": "autotray-router-backend"}


# ---------------------------------------------------------------------------
# Project Management Database Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/v1/projects", response_model=List[ProjectSummary])
def list_projects_endpoint(db: Session = Depends(get_db)):
    return get_projects(db)


@app.post("/api/v1/projects", response_model=ProjectDetail)
def create_project_endpoint(payload: ProjectCreate, db: Session = Depends(get_db)):
    try:
        return create_project(db, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create project: {str(e)}")


@app.get("/api/v1/projects/{project_id}", response_model=ProjectDetail)
def get_project_endpoint(project_id: str, db: Session = Depends(get_db)):
    proj = get_project(db, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return proj


@app.put("/api/v1/projects/{project_id}", response_model=ProjectDetail)
def update_project_endpoint(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    proj = update_project(db, project_id, payload)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return proj


@app.delete("/api/v1/projects/{project_id}")
def delete_project_endpoint(project_id: str, db: Session = Depends(get_db)):
    success = delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return {"status": "deleted", "id": project_id}


@app.post("/api/v1/projects/{project_id}/calculate", response_model=CalculationResponse)
def calculate_and_save_project_endpoint(project_id: str, db: Session = Depends(get_db)):
    proj = get_project(db, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    try:
        calc_response = solve_routing_and_sizing(
            parameters=proj.parameters,
            branches=proj.branches,
            cables=proj.cables,
            node_fittings=proj.node_fittings,
        )
        save_project_calculation(db, project_id, calc_response)
        return calc_response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation error: {str(e)}")


# ---------------------------------------------------------------------------
# Cable Technical Catalog Database Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/v1/catalog", response_model=List[CableCatalogItem])
def list_catalog_endpoint(
    category: Optional[str] = Query(None, description="Filter by cable category"),
    search: Optional[str] = Query(None, description="Search cable designation, code, or standard"),
    db: Session = Depends(get_db),
):
    return get_cable_catalog(db, category=category, search=search)


@app.post("/api/v1/catalog", response_model=CableCatalogItem)
def add_catalog_item_endpoint(item: CableCatalogItem, db: Session = Depends(get_db)):
    try:
        return add_cable_to_catalog(db, item)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to add catalog item: {str(e)}")


# ---------------------------------------------------------------------------
# Sizing Computation & Export Endpoints
# ---------------------------------------------------------------------------


@app.post("/api/v1/calculate-sizing", response_model=CalculationResponse)
def calculate_sizing(request: CalculationRequest):
    try:
        response = solve_routing_and_sizing(
            parameters=request.parameters,
            branches=request.branches,
            cables=request.cables,
            node_fittings=request.node_fittings,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation error: {str(e)}")


@app.post("/api/v1/export-excel")
def export_excel(payload: CalculationResponse):
    try:
        excel_stream = generate_excel_report(payload)
        filename = "AutoTray_Sizing_Report.xlsx"
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel report: {str(e)}")


@app.get("/api/v1/sample-template")
def download_sample_template():
    try:
        template_stream = generate_sample_excel_workbook()
        filename = "AutoTray_Sample_Template.xlsx"
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
        return StreamingResponse(
            template_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate sample template: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
