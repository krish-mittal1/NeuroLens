"""
doctor_finder.py
----------------
Find nearby neurosurgeons based on patient location.
"""

from geopy.distance import geodesic
from typing import List, Dict, Tuple


# Mock database of neurosurgeons (in production, this would be a real database)
NEUROSURGEON_DATABASE = [
    {
        "id": "NS001",
        "name": "Dr. Sarah Mitchell",
        "specialty": "Neurosurgery",
        "sub_specialty": "Brain Tumor Surgery",
        "hospital": "City General Hospital",
        "location": {"lat": 40.7128, "lon": -74.0060, "city": "New York", "state": "NY"},
        "rating": 4.8,
        "experience_years": 15,
        "phone": "+1-555-0101",
        "email": "s.mitchell@citygeneral.com"
    },
    {
        "id": "NS002",
        "name": "Dr. James Chen",
        "specialty": "Neurosurgery",
        "sub_specialty": "Minimally Invasive Surgery",
        "hospital": "Metropolitan Medical Center",
        "location": {"lat": 40.7589, "lon": -73.9851, "city": "New York", "state": "NY"},
        "rating": 4.9,
        "experience_years": 20,
        "phone": "+1-555-0102",
        "email": "j.chen@metromedical.com"
    },
    {
        "id": "NS003",
        "name": "Dr. Emily Rodriguez",
        "specialty": "Neurosurgery",
        "sub_specialty": "Pediatric Neurosurgery",
        "hospital": "Children's Neurological Institute",
        "location": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles", "state": "CA"},
        "rating": 4.7,
        "experience_years": 12,
        "phone": "+1-555-0103",
        "email": "e.rodriguez@childrensneurology.com"
    },
    {
        "id": "NS004",
        "name": "Dr. Michael Thompson",
        "specialty": "Neurosurgery",
        "sub_specialty": "Skull Base Surgery",
        "hospital": "University Hospital",
        "location": {"lat": 41.8781, "lon": -87.6298, "city": "Chicago", "state": "IL"},
        "rating": 4.9,
        "experience_years": 18,
        "phone": "+1-555-0104",
        "email": "m.thompson@universityhospital.com"
    },
    {
        "id": "NS005",
        "name": "Dr. Lisa Patel",
        "specialty": "Neurosurgery",
        "sub_specialty": "Neuro-Oncology",
        "hospital": "Advanced Brain Center",
        "location": {"lat": 29.7604, "lon": -95.3698, "city": "Houston", "state": "TX"},
        "rating": 4.8,
        "experience_years": 16,
        "phone": "+1-555-0105",
        "email": "l.patel@advancedbraincenter.com"
    },
    {
        "id": "NS006",
        "name": "Dr. Robert Kim",
        "specialty": "Neurosurgery",
        "sub_specialty": "Stereotactic Surgery",
        "hospital": "Pacific Neuroscience Institute",
        "location": {"lat": 37.7749, "lon": -122.4194, "city": "San Francisco", "state": "CA"},
        "rating": 4.9,
        "experience_years": 22,
        "phone": "+1-555-0106",
        "email": "r.kim@pacificneuro.com"
    },
    {
        "id": "NS007",
        "name": "Dr. Amanda Foster",
        "specialty": "Neurosurgery",
        "sub_specialty": "Endoscopic Surgery",
        "hospital": "Boston Brain Institute",
        "location": {"lat": 42.3601, "lon": -71.0589, "city": "Boston", "state": "MA"},
        "rating": 4.7,
        "experience_years": 14,
        "phone": "+1-555-0107",
        "email": "a.foster@bostonbrain.com"
    },
    {
        "id": "NS008",
        "name": "Dr. David Martinez",
        "specialty": "Neurosurgery",
        "sub_specialty": "Vascular Neurosurgery",
        "hospital": "Sunshine Medical Center",
        "location": {"lat": 25.7617, "lon": -80.1918, "city": "Miami", "state": "FL"},
        "rating": 4.8,
        "experience_years": 17,
        "phone": "+1-555-0108",
        "email": "d.martinez@sunshinemedical.com"
    }
]


def calculate_distance(loc1: Tuple[float, float], loc2: Dict) -> float:
    """
    Calculate distance between two locations in kilometers.
    
    Args:
        loc1: Tuple of (latitude, longitude) for patient location
        loc2: Dict with 'lat' and 'lon' keys for doctor location
    
    Returns:
        float: Distance in kilometers
    """
    return geodesic(loc1, (loc2['lat'], loc2['lon'])).kilometers


def find_nearby_doctors(
    patient_lat: float,
    patient_lon: float,
    max_distance_km: float = 100,
    limit: int = 5
) -> List[Dict]:
    """
    Find neurosurgeons near the patient's location.
    
    Args:
        patient_lat: Patient's latitude
        patient_lon: Patient's longitude
        max_distance_km: Maximum search radius in kilometers
        limit: Maximum number of doctors to return
    
    Returns:
        List of doctor dictionaries with distance information
    """
    patient_location = (patient_lat, patient_lon)
    doctors_with_distance = []
    
    for doctor in NEUROSURGEON_DATABASE:
        distance = calculate_distance(patient_location, doctor['location'])
        
        if distance <= max_distance_km:
            doctor_info = doctor.copy()
            doctor_info['distance_km'] = round(distance, 2)
            doctor_info['distance_miles'] = round(distance * 0.621371, 2)
            doctors_with_distance.append(doctor_info)
    
    # Sort by distance
    doctors_with_distance.sort(key=lambda x: x['distance_km'])
    
    # Return top N results
    return doctors_with_distance[:limit]


def get_doctor_by_id(doctor_id: str) -> Dict:
    """
    Get detailed information about a specific doctor.
    
    Args:
        doctor_id: Unique doctor identifier
    
    Returns:
        Dict with doctor information or None if not found
    """
    for doctor in NEUROSURGEON_DATABASE:
        if doctor['id'] == doctor_id:
            return doctor.copy()
    return None
