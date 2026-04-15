"""
NeuroLens Backend â€” FastAPI Application
---------------------------------------
Browser-based surgical decision intelligence platform.
Converts MRI scans into interactive 3D visualizations with structured clinical insights.
"""

import os
import uvicorn

# Load .env file if present (must happen before any os.getenv calls)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed — env vars must be set in the system shell

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.analyze import router as analyze_router
from app.routes.reports import router as reports_router

# Create FastAPI app
app = FastAPI(
    title="NeuroLens API",
    description="Surgical Decision Intelligence Platform â€” MRI to 3D Insight",
    version="1.0.0",
)

# CORS â€” allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving (for mesh .obj files)
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Register routes
app.include_router(analyze_router, prefix="/api", tags=["Analysis"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])


@app.get("/")
async def root():
    return {
        "name": "NeuroLens API",
        "version": "1.0.0",
        "status": "running",
        "frontend": "Run the separate React app from the frontend directory",
        "endpoints": {
            "analyze": "POST /api/analyze",
            "sample": "GET /api/sample-analysis",
            "static": "/static/{filename}",
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    sample_data_exists = os.path.exists(
        os.path.join(os.path.dirname(__file__), "..", "sample_data", "volume.npy")
    )
    return {
        "status": "healthy",
        "sample_data_ready": sample_data_exists,
    }



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)