from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import CalculationRequest, CalculationResponse
from .routing_engine import solve_routing_and_sizing
from .excel_exporter import generate_excel_report
from .sample_generator import generate_sample_excel_workbook

app = FastAPI(
    title="AutoTray-Router: Industrial Cable Tray & Multi-Level Riser Sizing Engine",
    version="1.0.0",
    description="High-performance cable tray sizing and multi-level riser routing API with NetworkX and OpenPyXL.",
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
        "docs_url": "/docs",
    }


@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "service": "autotray-router-backend"}


@app.post("/api/v1/calculate-sizing", response_model=CalculationResponse)
def calculate_sizing(request: CalculationRequest):
    try:
        response = solve_routing_and_sizing(
            parameters=request.parameters,
            branches=request.branches,
            cables=request.cables,
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
