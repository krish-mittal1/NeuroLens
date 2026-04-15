import { useState, useEffect } from "react";

/**
 * PatientReport - Display validated report with PDF download, nearby doctors, and surgery recommendations
 */
export default function PatientReport({ reportData }) {
  const [nearbyDoctors, setNearbyDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [selectedSurgery, setSelectedSurgery] = useState(null);

  const { report_id, pdf_url, surgery_recommendations, validation_data, analysis_data } = reportData;
  const summary = analysis_data?.summary || {};

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          setLocationError("Unable to get your location. Please enable location services.");
          // Use default location (New York) as fallback
          setUserLocation({ latitude: 40.7128, longitude: -74.0060 });
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setUserLocation({ latitude: 40.7128, longitude: -74.0060 });
    }
  }, []);

  // Find nearby doctors when location is available
  useEffect(() => {
    if (userLocation) {
      findNearbyDoctors();
    }
  }, [userLocation]);

  const findNearbyDoctors = async () => {
    if (!userLocation) return;

    setLoadingDoctors(true);
    try {
      const response = await fetch("http://localhost:8000/api/reports/find-doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          max_distance_km: 100,
          limit: 5
        })
      });

      if (!response.ok) throw new Error("Failed to find doctors");

      const data = await response.json();
      setNearbyDoctors(data.doctors || []);
    } catch (error) {
      console.error("Error finding doctors:", error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`http://localhost:8000${pdf_url}`, "_blank");
  };

  const getSurgeryColor = (score) => {
    if (score >= 8) return "#22C55E";
    if (score >= 6) return "#2DD4BF";
    if (score >= 4) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="patient-report">
      {/* Header with Download Button */}
      <div className="report-header">
        <div>
          <h2>Medical Report Ready</h2>
          <p className="report-id">Report ID: {report_id}</p>
          <p className="report-status">
            Status: <span className={`status-badge status-${validation_data?.status}`}>
              {validation_data?.status?.replace('_', ' ').toUpperCase()}
            </span>
          </p>
        </div>
        <button className="btn btn-primary btn-download" onClick={handleDownloadPDF}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF Report
        </button>
      </div>

      {/* Quick Summary */}
      <div className="report-section">
        <h3>Analysis Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Region</span>
            <span className="summary-value">{summary.region || "N/A"}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Volume</span>
            <span className="summary-value">{summary.volume || "N/A"}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Risk Level</span>
            <span className={`summary-value risk-${summary.risk_level?.toLowerCase()}`}>
              {summary.risk_level || "N/A"}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Validated By</span>
            <span className="summary-value">Dr. {validation_data?.doctor_name}</span>
          </div>
        </div>
      </div>

      {/* Surgery Recommendations */}
      <div className="report-section">
        <h3>Recommended Surgical Approaches</h3>
        <p className="section-desc">
          Based on tumor characteristics, the following surgical approaches are recommended in order of suitability:
        </p>
        <div className="surgery-list">
          {surgery_recommendations?.map((surgery, idx) => (
            <div key={idx} className="surgery-card" onClick={() => setSelectedSurgery(surgery)}>
              <div className="surgery-header">
                <div>
                  <h4>{surgery.name}</h4>
                  <p className="surgery-desc">{surgery.description}</p>
                </div>
                <div className="surgery-score" style={{ borderColor: getSurgeryColor(surgery.suitability_score) }}>
                  <span className="score-value" style={{ color: getSurgeryColor(surgery.suitability_score) }}>
                    {surgery.suitability_score}
                  </span>
                  <span className="score-label">/10</span>
                </div>
              </div>
              <div className="surgery-details">
                <div className="surgery-detail-item">
                  <strong>Rationale:</strong> {surgery.rationale}
                </div>
                <div className="surgery-detail-row">
                  <div className="surgery-detail-item">
                    <strong>Recovery:</strong> {surgery.recovery_time}
                  </div>
                  <div className="surgery-detail-item">
                    <strong>Risks:</strong> {surgery.risks}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Doctors */}
      <div className="report-section">
        <h3>Nearby Neurosurgeons</h3>
        {locationError && (
          <p className="location-notice">{locationError}</p>
        )}
        {loadingDoctors ? (
          <div className="loading-doctors">
            <span className="spinner" />
            <span>Finding nearby specialists...</span>
          </div>
        ) : nearbyDoctors.length > 0 ? (
          <div className="doctors-list">
            {nearbyDoctors.map((doctor) => (
              <div key={doctor.id} className="doctor-card">
                <div className="doctor-header">
                  <div>
                    <h4>{doctor.name}</h4>
                    <p className="doctor-specialty">{doctor.sub_specialty}</p>
                    <p className="doctor-hospital">{doctor.hospital}</p>
                  </div>
                  <div className="doctor-rating">
                    <span className="rating-value">★ {doctor.rating}</span>
                    <span className="rating-label">{doctor.experience_years} years exp.</span>
                  </div>
                </div>
                <div className="doctor-details">
                  <div className="doctor-detail-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{doctor.location.city}, {doctor.location.state}</span>
                    <span className="distance-badge">{doctor.distance_miles} miles away</span>
                  </div>
                  <div className="doctor-contact">
                    <a href={`tel:${doctor.phone}`} className="contact-link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {doctor.phone}
                    </a>
                    <a href={`mailto:${doctor.email}`} className="contact-link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Email
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-doctors">No neurosurgeons found within 100 miles. Try expanding your search radius.</p>
        )}
      </div>

      {/* Doctor's Notes */}
      {validation_data?.doctor_notes && (
        <div className="report-section">
          <h3>Doctor's Clinical Assessment</h3>
          <div className="doctor-notes">
            <p>{validation_data.doctor_notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
