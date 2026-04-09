"""
analyze.py
----------
API route for the main /analyze endpoint.
Orchestrates the full pipeline: load -> segment -> postprocess -> mesh -> metrics -> reasoning.
"""

import os
import shutil
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.brats_loader import list_brats_cases, load_brats_case
from app.services.dicom_loader import load_volume_from_input, load_volume_from_npy
from app.services.evaluator import evaluate_segmentation
from app.services.explainer import generate_reasoning
from app.services.mesh_builder import build_brain_mesh, build_mesh
from app.services.metrics import extract_metrics
from app.services.postprocessor import postprocess_mask
from app.services.sample_data import ensure_sample_dataset
from app.services.segmentor import get_model_status, load_mask_from_path, segment_tumor, segment_tumor_with_info

router = APIRouter()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_data")
STATIC_DIR = os.path.join(BASE_DIR, "app", "static")


def _build_analysis_response(
    volume,
    input_metadata,
    mask_path=None,
    pipeline_mode="demo_sample",
    modality_volumes=None,
    force_model_inference=False,
):
    voxel_spacing = tuple(input_metadata.get("voxel_spacing", [1.0, 1.0, 1.0]))

    print("\n[Pipeline Step 2/6] Segmenting tumor...")
    if force_model_inference:
        print("  Forcing MONAI/model inference path")
        mask, segmentation_mode = segment_tumor_with_info(volume, modality_volumes=modality_volumes)
    elif mask_path and os.path.exists(mask_path):
        print("  Using bundled or uploaded pre-segmented mask")
        mask = load_mask_from_path(mask_path)
        segmentation_mode = "presegmented_mask"
    else:
        mask, segmentation_mode = segment_tumor_with_info(volume, modality_volumes=modality_volumes)

    print("\n[Pipeline Step 3/6] Post-processing mask...")
    clean_mask = postprocess_mask(mask)

    print("\n[Pipeline Step 4/6] Generating 3D meshes...")
    tumor_mesh = build_mesh(
        clean_mask,
        output_dir=STATIC_DIR,
        voxel_spacing=voxel_spacing,
    )
    brain_mesh = build_brain_mesh(
        volume,
        output_dir=STATIC_DIR,
        voxel_spacing=voxel_spacing,
    )

    if not tumor_mesh:
        raise HTTPException(status_code=500, detail="Failed to generate tumor mesh")

    print("\n[Pipeline Step 5/6] Extracting clinical metrics...")
    metrics = extract_metrics(clean_mask, volume, voxel_spacing=voxel_spacing)

    print("\n[Pipeline Step 6/6] Generating reasoning trace...")
    reasoning = generate_reasoning(metrics)

    response = {
        "status": "success",
        "mesh_url": f"/static/{tumor_mesh['filename']}",
        "brain_mesh_url": f"/static/{brain_mesh['filename']}" if brain_mesh else None,
        "mesh_info": {
            "vertices": tumor_mesh["vertex_count"],
            "faces": tumor_mesh["face_count"],
        },
        "pipeline": {
            "mode": pipeline_mode,
            "input_type": input_metadata.get("source_type", "sample"),
            "segmentation_mode": segmentation_mode,
            "voxel_spacing_mm": [float(v) for v in voxel_spacing],
        },
        "input_metadata": input_metadata,
        "metrics": metrics,
        "reasoning": reasoning,
        "summary": {
            "region": metrics["region"],
            "volume": f"{metrics['tumor_volume_cm3']:.1f} cm3",
            "dimensions": metrics["dimensions_str"],
            "laterality": metrics["laterality"],
            "depth": f"{metrics['depth_mm']:.1f} mm",
            "risk_level": metrics["risk_level"],
        },
    }

    print("\n" + "=" * 60)
    print("Analysis Complete")
    print(f"  Region: {metrics['region']}")
    print(f"  Volume: {metrics['tumor_volume_cm3']:.2f} cm3")
    print(f"  Risk: {metrics['risk_level']}")
    print("=" * 60)

    return response


@router.post("/analyze")
async def analyze_scan(file: UploadFile = File(None)):
    """
    Main analysis endpoint.

    Accepts an uploaded scan archive/file or uses generated sample data.
    Returns:
    - mesh_url: URL to the generated tumor .obj file
    - brain_mesh_url: URL to the brain surface .obj file
    - metrics: clinical metrics dict
    - reasoning: step-by-step reasoning trace
    """
    cleanup_dir = None

    try:
        print("\n" + "=" * 60)
        print("NeuroLens - Starting Analysis Pipeline")
        print("=" * 60)

        print("\n[Pipeline Step 1/6] Loading volume data...")

        os.makedirs(STATIC_DIR, exist_ok=True)
        input_metadata = {}
        mask_path = None
        pipeline_mode = "demo_sample"

        if file and file.filename:
            upload_dir = os.path.join(STATIC_DIR, "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            upload_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{file.filename}")

            with open(upload_path, "wb") as saved_file:
                content = await file.read()
                saved_file.write(content)

            print(f"  File uploaded: {file.filename} ({len(content)} bytes)")
            loaded_input = load_volume_from_input(upload_path)
            volume = loaded_input["volume"]
            input_metadata = loaded_input.get("metadata", {})
            mask_path = loaded_input.get("mask_path")
            cleanup_dir = loaded_input.get("temp_dir")
            pipeline_mode = "uploaded_scan"
        else:
            sample_paths = ensure_sample_dataset(SAMPLE_DIR)
            print("  No file uploaded - using generated sample data")
            volume = load_volume_from_npy(sample_paths["volume_path"])
            input_metadata = {
                "source_type": sample_paths["source"],
                "slice_count": int(volume.shape[0]),
                "voxel_spacing": [1.0, 1.0, 1.0],
            }
            mask_path = sample_paths["mask_path"]
        response = _build_analysis_response(
            volume=volume,
            input_metadata=input_metadata,
            mask_path=mask_path,
            pipeline_mode=pipeline_mode,
            modality_volumes=None,
        )
        return JSONResponse(content=response)

    except Exception as exc:
        print(f"\n[ERROR] Pipeline failed: {str(exc)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}")
    finally:
        if cleanup_dir and os.path.isdir(cleanup_dir):
            shutil.rmtree(cleanup_dir, ignore_errors=True)


@router.get("/sample-analysis")
async def sample_analysis():
    """
    Run analysis on generated sample data without needing an upload.
    Useful for demos and testing.
    """
    return await analyze_scan(file=None)


@router.get("/brats-cases")
async def brats_cases(limit: int = 20):
    """
    List locally available BraTS cases from the configured dataset root.
    """
    try:
        cases = list_brats_cases(limit=limit)
        return {"status": "success", "cases": cases}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list BraTS cases: {str(exc)}")


@router.get("/brats-analysis/{case_id}")
async def brats_analysis(case_id: str, modality: str = "flair", source: str = "ground_truth"):
    """
    Analyze a local BraTS case using one MRI modality for visualization and the provided
    BraTS segmentation label as the ground-truth mask.
    """
    try:
        print("\n" + "=" * 60)
        print(f"NeuroLens - Starting BraTS Case Analysis ({case_id})")
        print("=" * 60)
        print("\n[Pipeline Step 1/6] Loading BraTS case data...")

        os.makedirs(STATIC_DIR, exist_ok=True)
        case_data = load_brats_case(case_id, preferred_modality=modality)
        use_model = source.lower() == "model"
        response = _build_analysis_response(
            volume=case_data["volume"],
            input_metadata=case_data["metadata"],
            mask_path=None if use_model else case_data.get("mask_path"),
            pipeline_mode="brats_case",
            modality_volumes=case_data.get("modality_volumes"),
            force_model_inference=use_model,
        )
        return JSONResponse(content=response)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BraTS analysis failed: {str(exc)}")


@router.get("/model-status")
async def model_status():
    return {"status": "success", "model": get_model_status()}


@router.get("/brats-evaluate/{case_id}")
async def brats_evaluate(case_id: str, modality: str = "flair", source: str = "model"):
    """
    Evaluate a predicted segmentation against the BraTS ground-truth segmentation.
    source=model uses MONAI/heuristic path, source=ground_truth should score ~1.0.
    """
    try:
        case_data = load_brats_case(case_id, preferred_modality=modality)
        ground_truth_path = case_data.get("mask_path")
        if not ground_truth_path:
            raise HTTPException(status_code=400, detail="No ground-truth segmentation found for this BraTS case")

        ground_truth = load_mask_from_path(ground_truth_path)
        if source.lower() == "ground_truth":
            predicted = ground_truth
            prediction_mode = "ground_truth"
        else:
            predicted, prediction_mode = segment_tumor_with_info(
                case_data["volume"],
                modality_volumes=case_data.get("modality_volumes"),
            )

        evaluation = evaluate_segmentation(predicted, ground_truth)
        return {
            "status": "success",
            "case_id": case_id,
            "modality": modality,
            "source": source,
            "prediction_mode": prediction_mode,
            "evaluation": evaluation,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BraTS evaluation failed: {str(exc)}")
