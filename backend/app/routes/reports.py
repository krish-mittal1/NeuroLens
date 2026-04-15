"""
reports.py
----------
API routes for report generation, validation, and doctor recommendations.
"""

import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services.pdf_generator import generate_pdf_report
from app.services.doctor_finder import find_nearby_doctors, get_doctor_by_id
from app.services.surgery_recommender import recommend_surgeries, get_surgery_details


router = APIRouter()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REPORTS_DIR = os.path.join(BASE_DIR, "app", "static", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

# In-memory storage for validated reports (in production, use a database)
validated_reports = {}


class PatientInfo(BaseModel):
    patient_id: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    name: Optional[str] = None


class ValidationRequest(BaseModel):
    analysis_data: dict
    doctor_name: str
    doctor_license: str
    doctor_notes: str
    status: str  # "approved", "needs_revision", "rejected"
    patient_info: Optional[PatientInfo] = None


class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    max_distance_km: Optional[float] = 100
    limit: Optional[int] = 5


@router.post("/validate-report")
async def validate_report(request: ValidationRequest):
    """
    Doctor validates the AI-generated analysis and creates a downloadable report.
    
    Returns:
        - report_id: Unique identifier for the validated report
        - pdf_url: URL to download the PDF report
        - surgery_recommendations: List of recommended surgical approaches
    """
    try:
        # Generate unique report ID
        report_id = f"NL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Get surgery recommendations based on metrics
        metrics = request.analysis_data.get('metrics', {})
        surgery_recommendations = recommend_surgeries(metrics)
        
        # Prepare validation data
        validation_data = {
            "report_id": report_id,
            "doctor_name": request.doctor_name,
            "doctor_license": request.doctor_license,
            "doctor_notes": request.doctor_notes,
            "status": request.status,
            "validation_date": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "surgery_recommendations": surgery_recommendations,
            "patient_info": request.patient_info.dict() if request.patient_info else None
        }
        
        # Generate PDF report
        pdf_filename = f"report_{report_id}.pdf"
        pdf_path = os.path.join(REPORTS_DIR, pdf_filename)
        generate_pdf_report(request.analysis_data, validation_data, pdf_path)
        
        # Store validated report data
        validated_reports[report_id] = {
            "analysis_data": request.analysis_data,
            "validation_data": validation_data,
            "pdf_path": pdf_path,
            "pdf_filename": pdf_filename,
            "created_at": datetime.now().isoformat(),
            "surgery_recommendations": surgery_recommendations
        }
        
        return {
            "status": "success",
            "report_id": report_id,
            "pdf_url": f"/api/reports/download/{report_id}",
            "surgery_recommendations": surgery_recommendations,
            "validation_data": validation_data
        }
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report validation failed: {str(exc)}")


@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """
    Download a validated PDF report.
    """
    if report_id not in validated_reports:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report = validated_reports[report_id]
    pdf_path = report['pdf_path']
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=report['pdf_filename'],
        headers={
            "Content-Disposition": f"attachment; filename={report['pdf_filename']}"
        }
    )


@router.get("/report/{report_id}")
async def get_report_details(report_id: str):
    """
    Get details of a validated report without downloading the PDF.
    """
    if report_id not in validated_reports:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report = validated_reports[report_id]
    return {
        "status": "success",
        "report_id": report_id,
        "analysis_data": report['analysis_data'],
        "validation_data": report['validation_data'],
        "surgery_recommendations": report['surgery_recommendations'],
        "created_at": report['created_at'],
        "pdf_url": f"/api/reports/download/{report_id}"
    }


@router.post("/find-doctors")
async def find_doctors(request: LocationRequest):
    """
    Find nearby neurosurgeons based on patient location.
    
    Returns list of doctors sorted by distance.
    """
    try:
        doctors = find_nearby_doctors(
            patient_lat=request.latitude,
            patient_lon=request.longitude,
            max_distance_km=request.max_distance_km,
            limit=request.limit
        )
        
        return {
            "status": "success",
            "count": len(doctors),
            "doctors": doctors,
            "search_location": {
                "latitude": request.latitude,
                "longitude": request.longitude
            }
        }
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Doctor search failed: {str(exc)}")


@router.get("/doctor/{doctor_id}")
async def get_doctor_details(doctor_id: str):
    """
    Get detailed information about a specific doctor.
    """
    doctor = get_doctor_by_id(doctor_id)
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    return {
        "status": "success",
        "doctor": doctor
    }


@router.post("/surgery-recommendations")
async def get_surgery_recommendations(metrics: dict):
    """
    Get surgery recommendations based on tumor metrics.
    """
    try:
        recommendations = recommend_surgeries(metrics)
        
        return {
            "status": "success",
            "recommendations": recommendations
        }
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Surgery recommendation failed: {str(exc)}")


@router.get("/surgery-details/{surgery_name}")
async def get_surgery_info(surgery_name: str):
    """
    Get detailed information about a specific surgical approach.
    """
    details = get_surgery_details(surgery_name)
    
    if not details:
        raise HTTPException(status_code=404, detail="Surgery information not found")
    
    return {
        "status": "success",
        "surgery_name": surgery_name,
        "details": details
    }


@router.get("/list-reports")
async def list_reports():
    """
    List all validated reports (for admin/doctor dashboard).
    """
    reports_list = []
    
    for report_id, report_data in validated_reports.items():
        summary = report_data['analysis_data'].get('summary', {})
        validation = report_data['validation_data']
        
        reports_list.append({
            "report_id": report_id,
            "created_at": report_data['created_at'],
            "doctor_name": validation.get('doctor_name'),
            "status": validation.get('status'),
            "patient_id": validation.get('patient_info', {}).get('patient_id') if validation.get('patient_info') else None,
            "tumor_region": summary.get('region'),
            "risk_level": summary.get('risk_level'),
            "pdf_url": f"/api/reports/download/{report_id}"
        })
    
    # Sort by creation date (newest first)
    reports_list.sort(key=lambda x: x['created_at'], reverse=True)
    
    return {
        "status": "success",
        "count": len(reports_list),
        "reports": reports_list
    }
