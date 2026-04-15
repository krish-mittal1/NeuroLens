"""
surgery_recommender.py
----------------------
Recommend surgical approaches based on tumor characteristics.
"""

from typing import List, Dict


def recommend_surgeries(metrics: Dict) -> List[Dict]:
    """
    Recommend surgical approaches based on tumor metrics.
    
    Args:
        metrics: Dict containing tumor metrics (volume, location, risk factors, etc.)
    
    Returns:
        List of surgery recommendations with suitability scores
    """
    recommendations = []
    
    # Extract key metrics
    tumor_volume = metrics.get('tumor_volume_cm3', 0)
    region = metrics.get('region', '').lower()
    laterality = metrics.get('laterality', '').lower()
    depth_mm = metrics.get('depth_mm', 0)
    risk_level = metrics.get('risk_level', '').lower()
    midline_distance = metrics.get('midline_distance_mm', 0)
    
    # 1. Craniotomy (Open Surgery)
    craniotomy_score = 7.0
    craniotomy_rationale = []
    
    if tumor_volume > 10:
        craniotomy_score += 2.0
        craniotomy_rationale.append("Large tumor volume favors open approach")
    elif tumor_volume < 3:
        craniotomy_score -= 1.5
        craniotomy_rationale.append("Small tumor may be suitable for less invasive approaches")
    
    if depth_mm > 30:
        craniotomy_score -= 1.0
        craniotomy_rationale.append("Deep location increases surgical complexity")
    
    if 'frontal' in region or 'temporal' in region:
        craniotomy_score += 1.0
        craniotomy_rationale.append("Accessible location for craniotomy")
    
    recommendations.append({
        "name": "Open Craniotomy",
        "suitability_score": min(10, max(1, round(craniotomy_score, 1))),
        "rationale": "; ".join(craniotomy_rationale) if craniotomy_rationale else "Standard approach for most brain tumors",
        "description": "Traditional open surgery with direct visualization of the tumor",
        "recovery_time": "4-6 weeks",
        "risks": "Infection, bleeding, neurological deficits"
    })
    
    # 2. Minimally Invasive Endoscopic Surgery
    endoscopic_score = 5.0
    endoscopic_rationale = []
    
    if tumor_volume < 5:
        endoscopic_score += 2.5
        endoscopic_rationale.append("Small tumor size suitable for endoscopic approach")
    elif tumor_volume > 15:
        endoscopic_score -= 2.0
        endoscopic_rationale.append("Large tumor may require open approach")
    
    if 'ventricle' in region or 'pituitary' in region:
        endoscopic_score += 2.0
        endoscopic_rationale.append("Location accessible via endoscopic route")
    
    if depth_mm < 20:
        endoscopic_score += 1.0
        endoscopic_rationale.append("Superficial location favorable for endoscopy")
    
    recommendations.append({
        "name": "Minimally Invasive Endoscopic Surgery",
        "suitability_score": min(10, max(1, round(endoscopic_score, 1))),
        "rationale": "; ".join(endoscopic_rationale) if endoscopic_rationale else "Less invasive approach through small incisions",
        "description": "Surgery using small cameras and instruments through tiny openings",
        "recovery_time": "2-3 weeks",
        "risks": "Limited visualization, incomplete resection"
    })
    
    # 3. Stereotactic Radiosurgery (Gamma Knife / CyberKnife)
    radiosurgery_score = 6.0
    radiosurgery_rationale = []
    
    if tumor_volume < 3:
        radiosurgery_score += 2.5
        radiosurgery_rationale.append("Small tumor ideal for focused radiation")
    elif tumor_volume > 10:
        radiosurgery_score -= 3.0
        radiosurgery_rationale.append("Large tumor exceeds typical radiosurgery limits")
    
    if depth_mm > 40:
        radiosurgery_score += 1.5
        radiosurgery_rationale.append("Deep location difficult for surgery, good for radiosurgery")
    
    if risk_level == 'high':
        radiosurgery_score -= 1.0
        radiosurgery_rationale.append("High-risk features may require tissue diagnosis")
    
    if 'eloquent' in str(metrics.get('region_function', '')).lower():
        radiosurgery_score += 1.0
        radiosurgery_rationale.append("Non-invasive approach preserves eloquent cortex")
    
    recommendations.append({
        "name": "Stereotactic Radiosurgery",
        "suitability_score": min(10, max(1, round(radiosurgery_score, 1))),
        "rationale": "; ".join(radiosurgery_rationale) if radiosurgery_rationale else "Non-invasive radiation therapy for small tumors",
        "description": "Highly focused radiation beams target the tumor without incisions",
        "recovery_time": "Few days (outpatient)",
        "risks": "Radiation necrosis, delayed effect, no tissue for pathology"
    })
    
    # 4. Awake Craniotomy
    awake_score = 4.0
    awake_rationale = []
    
    if 'eloquent' in str(metrics.get('region_function', '')).lower():
        awake_score += 3.0
        awake_rationale.append("Tumor in eloquent cortex requires functional monitoring")
    
    if 'frontal' in region or 'temporal' in region or 'parietal' in region:
        awake_score += 1.5
        awake_rationale.append("Location suitable for awake monitoring")
    
    if tumor_volume > 20:
        awake_score -= 1.0
        awake_rationale.append("Large tumor may be challenging for awake procedure")
    
    recommendations.append({
        "name": "Awake Craniotomy with Brain Mapping",
        "suitability_score": min(10, max(1, round(awake_score, 1))),
        "rationale": "; ".join(awake_rationale) if awake_rationale else "Allows real-time functional monitoring during surgery",
        "description": "Patient is awake during critical portions to test brain function",
        "recovery_time": "4-5 weeks",
        "risks": "Patient anxiety, seizures, incomplete resection if function threatened"
    })
    
    # 5. Laser Interstitial Thermal Therapy (LITT)
    litt_score = 5.5
    litt_rationale = []
    
    if tumor_volume < 8:
        litt_score += 2.0
        litt_rationale.append("Tumor size appropriate for laser ablation")
    elif tumor_volume > 15:
        litt_score -= 2.0
        litt_rationale.append("Large tumor may require multiple treatments")
    
    if depth_mm > 35:
        litt_score += 2.0
        litt_rationale.append("Deep location ideal for minimally invasive laser therapy")
    
    if midline_distance < 10:
        litt_score -= 1.0
        litt_rationale.append("Proximity to midline structures requires caution")
    
    recommendations.append({
        "name": "Laser Interstitial Thermal Therapy (LITT)",
        "suitability_score": min(10, max(1, round(litt_score, 1))),
        "rationale": "; ".join(litt_rationale) if litt_rationale else "Minimally invasive laser ablation through small burr hole",
        "description": "MRI-guided laser probe heats and destroys tumor tissue",
        "recovery_time": "1-2 weeks",
        "risks": "Incomplete ablation, thermal injury to adjacent tissue, edema"
    })
    
    # Sort by suitability score (highest first)
    recommendations.sort(key=lambda x: x['suitability_score'], reverse=True)
    
    return recommendations


def get_surgery_details(surgery_name: str) -> Dict:
    """
    Get detailed information about a specific surgical approach.
    
    Args:
        surgery_name: Name of the surgical procedure
    
    Returns:
        Dict with detailed surgery information
    """
    surgery_database = {
        "Open Craniotomy": {
            "full_name": "Open Craniotomy with Microsurgical Resection",
            "duration": "3-6 hours",
            "anesthesia": "General anesthesia",
            "hospital_stay": "3-7 days",
            "success_rate": "85-95%",
            "complications": ["Infection (1-3%)", "Bleeding (2-5%)", "Neurological deficit (5-10%)", "Seizures (10-20%)"],
            "ideal_candidates": "Patients with accessible tumors, good overall health, tumors requiring tissue diagnosis"
        },
        "Minimally Invasive Endoscopic Surgery": {
            "full_name": "Neuroendoscopic Tumor Resection",
            "duration": "2-4 hours",
            "anesthesia": "General anesthesia",
            "hospital_stay": "1-3 days",
            "success_rate": "80-90%",
            "complications": ["CSF leak (3-5%)", "Incomplete resection (10-15%)", "Vascular injury (1-2%)"],
            "ideal_candidates": "Patients with small, well-defined tumors in accessible locations"
        },
        "Stereotactic Radiosurgery": {
            "full_name": "Stereotactic Radiosurgery (Gamma Knife/CyberKnife)",
            "duration": "1-4 hours (single session)",
            "anesthesia": "None or light sedation",
            "hospital_stay": "Outpatient",
            "success_rate": "85-95% tumor control",
            "complications": ["Radiation necrosis (5-10%)", "Edema (10-20%)", "Delayed effect (months)"],
            "ideal_candidates": "Patients with small tumors (<3cm), deep locations, poor surgical candidates"
        },
        "Awake Craniotomy with Brain Mapping": {
            "full_name": "Awake Craniotomy with Intraoperative Cortical Mapping",
            "duration": "4-8 hours",
            "anesthesia": "Conscious sedation with local anesthesia",
            "hospital_stay": "2-5 days",
            "success_rate": "90-95% with preserved function",
            "complications": ["Seizures (5-15%)", "Speech/motor deficits (temporary 20-30%)", "Anxiety (variable)"],
            "ideal_candidates": "Patients with tumors in eloquent cortex (speech, motor areas)"
        },
        "Laser Interstitial Thermal Therapy (LITT)": {
            "full_name": "MRI-Guided Laser Interstitial Thermal Therapy",
            "duration": "2-4 hours",
            "anesthesia": "General anesthesia",
            "hospital_stay": "1-2 days",
            "success_rate": "75-85%",
            "complications": ["Edema (20-30%)", "Incomplete ablation (15-20%)", "Thermal injury (5%)"],
            "ideal_candidates": "Patients with deep, small tumors, recurrent tumors, poor surgical candidates"
        }
    }
    
    return surgery_database.get(surgery_name, {})
