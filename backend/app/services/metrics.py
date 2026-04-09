"""
metrics.py
----------
Extracts clinical metrics from the segmentation mask and volume.
Computes tumor volume, location, dimensions, depth, and risk assessment.
"""

import numpy as np


# Brain region mapping based on normalized coordinates
# Simplified atlas — maps (x, y, z) quadrants to brain regions
BRAIN_REGIONS = {
    ("left", "anterior", "superior"): {
        "region": "Left Frontal Lobe",
        "function": "Executive function, planning, voluntary movement",
        "risk_note": "Proximity to motor cortex — risk of motor deficits"
    },
    ("right", "anterior", "superior"): {
        "region": "Right Frontal Lobe", 
        "function": "Attention, spatial awareness, emotional processing",
        "risk_note": "Risk of personality changes and attention deficits"
    },
    ("left", "anterior", "inferior"): {
        "region": "Left Inferior Frontal (Broca's Area)",
        "function": "Speech production, language processing",
        "risk_note": "HIGH RISK — damage may cause expressive aphasia"
    },
    ("right", "anterior", "inferior"): {
        "region": "Right Inferior Frontal",
        "function": "Prosody, emotional aspects of speech",
        "risk_note": "Moderate risk — may affect emotional expression"
    },
    ("left", "posterior", "superior"): {
        "region": "Left Parietal Lobe",
        "function": "Sensory integration, spatial reasoning, calculation",
        "risk_note": "Risk of sensory loss and spatial disorientation"
    },
    ("right", "posterior", "superior"): {
        "region": "Right Parietal Lobe",
        "function": "Visuospatial processing, body awareness",
        "risk_note": "Risk of neglect syndrome and spatial deficits"
    },
    ("left", "posterior", "inferior"): {
        "region": "Left Temporal Lobe (Wernicke's Area)",
        "function": "Language comprehension, auditory processing, memory",
        "risk_note": "HIGH RISK — damage may cause receptive aphasia"
    },
    ("right", "posterior", "inferior"): {
        "region": "Right Temporal Lobe",
        "function": "Face recognition, music perception, visual memory",
        "risk_note": "Risk of prosopagnosia and memory deficits"
    },
}


def extract_metrics(mask: np.ndarray, volume: np.ndarray = None, voxel_spacing: tuple = (1.0, 1.0, 1.0)) -> dict:
    """
    Extract clinical metrics from a segmentation mask.
    
    Returns a comprehensive dict with:
    - Tumor volume (cm³)
    - Dimensions (L × W × H)
    - Location (brain region)
    - Centroid coordinates
    - Laterality
    - Depth estimate
    - Risk assessment
    """
    print("[Metrics] Extracting clinical metrics...")
    
    tumor_voxels = np.sum(mask > 0)
    
    if tumor_voxels == 0:
        return {"error": "No tumor detected in segmentation mask"}
    
    # === Volume ===
    voxel_volume_mm3 = voxel_spacing[0] * voxel_spacing[1] * voxel_spacing[2]
    volume_mm3 = tumor_voxels * voxel_volume_mm3
    volume_cm3 = volume_mm3 / 1000.0
    
    # === Bounding Box & Dimensions ===
    coords = np.argwhere(mask > 0)
    min_coords = coords.min(axis=0)
    max_coords = coords.max(axis=0)
    
    dimensions_voxels = max_coords - min_coords + 1
    dimensions_mm = dimensions_voxels * np.array(voxel_spacing)
    
    # === Centroid ===
    centroid = coords.mean(axis=0)
    centroid_normalized = centroid / np.array(mask.shape)  # Normalize to [0, 1]
    
    # === Laterality ===
    midline = mask.shape[2] / 2.0
    if centroid[2] < midline:
        laterality = "Left Hemisphere"
        lat_key = "left"
    else:
        laterality = "Right Hemisphere"
        lat_key = "right"
    
    # === Brain Region ===
    ant_post = "anterior" if centroid_normalized[1] < 0.5 else "posterior"
    sup_inf = "superior" if centroid_normalized[0] < 0.5 else "inferior"
    
    region_key = (lat_key, ant_post, sup_inf)
    region_info = BRAIN_REGIONS.get(region_key, {
        "region": "Unknown Region",
        "function": "Unable to determine",
        "risk_note": "Requires manual assessment"
    })
    
    # === Depth from Surface ===
    # Estimate depth as distance from centroid to nearest brain edge
    brain_boundary = mask.shape[0] / 2.0
    depth_voxels = min(
        centroid[0] - min_coords[0],
        max_coords[0] - centroid[0],
        centroid[1] - min_coords[1],
        max_coords[1] - centroid[1],
    )
    depth_mm = depth_voxels * voxel_spacing[0]
    
    # === Distance to Midline ===
    midline_distance_mm = abs(centroid[2] - midline) * voxel_spacing[2]
    
    # === Risk Assessment ===
    risk_level, risk_factors = _assess_risk(
        volume_cm3, region_info, depth_mm, midline_distance_mm
    )
    
    metrics = {
        "tumor_volume_cm3": round(volume_cm3, 2),
        "tumor_volume_mm3": round(volume_mm3, 1),
        "tumor_voxels": int(tumor_voxels),
        "dimensions_mm": {
            "length": round(float(dimensions_mm[2]), 1),
            "width": round(float(dimensions_mm[1]), 1),
            "height": round(float(dimensions_mm[0]), 1),
        },
        "dimensions_str": f"{dimensions_mm[2]:.1f} × {dimensions_mm[1]:.1f} × {dimensions_mm[0]:.1f} mm",
        "centroid_voxel": [round(float(c), 1) for c in centroid],
        "centroid_normalized": [round(float(c), 3) for c in centroid_normalized],
        "laterality": laterality,
        "region": region_info["region"],
        "region_function": region_info["function"],
        "depth_mm": round(depth_mm, 1),
        "midline_distance_mm": round(midline_distance_mm, 1),
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "risk_note": region_info["risk_note"],
    }
    
    print(f"  Volume: {volume_cm3:.2f} cm³")
    print(f"  Location: {region_info['region']}")
    print(f"  Risk: {risk_level}")
    print("[Metrics] Extraction complete.")
    
    return metrics


def _assess_risk(volume_cm3, region_info, depth_mm, midline_distance_mm):
    """Compute overall surgical risk level based on multiple factors."""
    risk_factors = []
    risk_score = 0
    
    # Volume-based risk
    if volume_cm3 > 30:
        risk_factors.append("Large tumor volume (>30 cm³)")
        risk_score += 3
    elif volume_cm3 > 15:
        risk_factors.append("Moderate tumor volume (15-30 cm³)")
        risk_score += 2
    elif volume_cm3 > 5:
        risk_factors.append("Small-moderate tumor volume (5-15 cm³)")
        risk_score += 1
    
    # Location-based risk
    if "HIGH RISK" in region_info.get("risk_note", ""):
        risk_factors.append(f"Located in eloquent cortex: {region_info['region']}")
        risk_score += 3
    elif "motor" in region_info.get("risk_note", "").lower():
        risk_factors.append("Near motor cortex")
        risk_score += 2
    
    # Depth-based risk
    if depth_mm > 40:
        risk_factors.append("Deep-seated tumor (>40mm from surface)")
        risk_score += 2
    elif depth_mm > 20:
        risk_factors.append("Moderate depth (20-40mm)")
        risk_score += 1
    
    # Midline proximity
    if midline_distance_mm < 10:
        risk_factors.append("Close to midline (<10mm) — risk of bilateral damage")
        risk_score += 2
    
    # Determine risk level
    if risk_score >= 6:
        risk_level = "High"
    elif risk_score >= 3:
        risk_level = "Moderate"
    else:
        risk_level = "Low"
    
    return risk_level, risk_factors
