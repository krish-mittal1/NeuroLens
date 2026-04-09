"""
explainer.py
------------
Generates traceable reasoning steps for the clinical analysis.
This is the "reasoning layer" — what makes NeuroLens not a black box.

Level 1: Rule-based reasoning templates.
Level 2: LLM-powered contextual explanations.
"""


def generate_reasoning(metrics: dict) -> list:
    """
    Generate a step-by-step reasoning trace from the extracted metrics.
    Each step has a title, detail, and confidence indicator.
    
    Returns a list of reasoning steps (dicts).
    """
    steps = []
    
    # Step 1: Detection
    steps.append({
        "step": 1,
        "title": "Tumor Detected",
        "icon": "🔍",
        "detail": (
            f"Segmentation model identified a mass in the {metrics['region']}. "
            f"The tumor spans {metrics['tumor_voxels']:,} voxels across the scan volume."
        ),
        "category": "detection",
        "confidence": "high"
    })
    
    # Step 2: Volume analysis
    volume = metrics['tumor_volume_cm3']
    if volume > 30:
        size_desc = "large"
        size_note = "This is a significant mass that may exert considerable pressure on surrounding structures."
    elif volume > 15:
        size_desc = "moderate"
        size_note = "The tumor is of moderate size, requiring careful surgical planning."
    elif volume > 5:
        size_desc = "small to moderate"
        size_note = "The tumor is relatively contained, which may favor a focused surgical approach."
    else:
        size_desc = "small"
        size_note = "The compact size may allow for minimally invasive approaches."
    
    steps.append({
        "step": 2,
        "title": "Volume Quantified",
        "icon": "📐",
        "detail": (
            f"Total tumor volume: {volume:.2f} cm³ — classified as {size_desc}. "
            f"Dimensions: {metrics['dimensions_str']}. {size_note}"
        ),
        "category": "measurement",
        "confidence": "high"
    })
    
    # Step 3: Location mapping
    steps.append({
        "step": 3,
        "title": "Anatomical Location Mapped",
        "icon": "🧭",
        "detail": (
            f"Tumor centroid localized to the {metrics['region']} ({metrics['laterality']}). "
            f"This region is primarily responsible for: {metrics['region_function']}. "
            f"Distance from midline: {metrics['midline_distance_mm']:.1f} mm."
        ),
        "category": "localization",
        "confidence": "high"
    })
    
    # Step 4: Depth analysis
    depth = metrics['depth_mm']
    if depth > 40:
        depth_note = "The tumor is deep-seated, which increases surgical complexity and may require advanced navigation techniques."
    elif depth > 20:
        depth_note = "The tumor is at moderate depth, accessible via standard craniotomy approaches."
    else:
        depth_note = "The tumor is superficially located, which generally favors surgical accessibility."
    
    steps.append({
        "step": 4,
        "title": "Depth Assessment",
        "icon": "📏",
        "detail": (
            f"Estimated depth from cortical surface: {depth:.1f} mm. {depth_note}"
        ),
        "category": "assessment",
        "confidence": "moderate"
    })
    
    # Step 5: Functional risk
    risk_level = metrics['risk_level']
    risk_factors = metrics['risk_factors']
    
    risk_detail = f"Overall surgical risk assessed as **{risk_level}**."
    if risk_factors:
        risk_detail += " Contributing factors: " + "; ".join(risk_factors) + "."
    
    risk_detail += f" {metrics['risk_note']}"
    
    steps.append({
        "step": 5,
        "title": "Risk Assessment",
        "icon": "⚠️",
        "detail": risk_detail,
        "category": "risk",
        "confidence": "moderate"
    })
    
    # Step 6: Surgical consideration
    approach = _suggest_approach(metrics)
    steps.append({
        "step": 6,
        "title": "Surgical Considerations",
        "icon": "🏥",
        "detail": approach,
        "category": "recommendation",
        "confidence": "moderate"
    })
    
    # Step 7: Disclaimer
    steps.append({
        "step": 7,
        "title": "Clinical Disclaimer",
        "icon": "📋",
        "detail": (
            "This AI-generated analysis is for decision support only and should not be used as "
            "the sole basis for clinical decisions. All findings should be validated by qualified "
            "medical professionals through clinical correlation, additional imaging, and histopathological "
            "examination where appropriate."
        ),
        "category": "disclaimer",
        "confidence": "n/a"
    })
    
    return steps


def _suggest_approach(metrics: dict) -> str:
    """Generate surgical approach suggestion based on metrics."""
    region = metrics['region']
    laterality = metrics['laterality']
    depth = metrics['depth_mm']
    volume = metrics['tumor_volume_cm3']
    risk = metrics['risk_level']
    
    parts = []
    
    # Approach based on location
    if "frontal" in region.lower():
        parts.append(
            f"Given the frontal lobe location ({laterality.lower()}), a frontal craniotomy approach "
            "may be considered."
        )
    elif "temporal" in region.lower():
        parts.append(
            f"The temporal location ({laterality.lower()}) suggests a pterional or temporal craniotomy "
            "approach may be appropriate."
        )
    elif "parietal" in region.lower():
        parts.append(
            f"The parietal location ({laterality.lower()}) may be accessed via a parietal craniotomy."
        )
    else:
        parts.append(f"Surgical approach should be determined based on detailed radiological review.")
    
    # Navigation recommendation
    if depth > 30 or risk == "High":
        parts.append(
            "Intraoperative neuronavigation and cortical mapping are strongly recommended "
            "given the depth and proximity to eloquent areas."
        )
    elif depth > 15:
        parts.append(
            "Intraoperative neuronavigation may assist with approach planning."
        )
    
    # Size-based consideration
    if volume > 20:
        parts.append(
            "Given the tumor volume, staged resection or debulking may be considered."
        )
    
    return " ".join(parts)
