import { useState } from "react";

/**
 * ValidationModal - Doctor validation form for AI analysis
 */
export default function ValidationModal({ isOpen, onClose, analysisData, onValidate }) {
  const [doctorName, setDoctorName] = useState("");
  const [doctorLicense, setDoctorLicense] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [status, setStatus] = useState("approved");
  const [patientId, setPatientId] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = {
        analysis_data: analysisData,
        doctor_name: doctorName,
        doctor_license: doctorLicense,
        doctor_notes: doctorNotes,
        status: status,
        patient_info: patientId ? {
          patient_id: patientId,
          age: patientAge,
          gender: patientGender
        } : null
      };

      const response = await fetch("http://localhost:8000/api/reports/validate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationData)
      });

      if (!response.ok) throw new Error("Validation failed");

      const result = await response.json();
      onValidate(result);
      onClose();
    } catch (error) {
      alert(`Validation error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Validate Analysis Report</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="validation-form">
          <div className="form-section">
            <h3>Doctor Information</h3>
            <div className="form-group">
              <label>Doctor Name *</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. John Smith"
                required
              />
            </div>

            <div className="form-group">
              <label>Medical License Number *</label>
              <input
                type="text"
                value={doctorLicense}
                onChange={(e) => setDoctorLicense(e.target.value)}
                placeholder="MD-123456"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Patient Information (Optional)</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Patient ID</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="P-12345"
                />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input
                  type="text"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="45"
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Validation Status *</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="approved"
                  checked={status === "approved"}
                  onChange={(e) => setStatus(e.target.value)}
                />
                <span>Approved</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="needs_revision"
                  checked={status === "needs_revision"}
                  onChange={(e) => setStatus(e.target.value)}
                />
                <span>Needs Revision</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="rejected"
                  checked={status === "rejected"}
                  onChange={(e) => setStatus(e.target.value)}
                />
                <span>Rejected</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Clinical Notes *</h3>
            <div className="form-group">
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter your clinical assessment, recommendations, and any additional observations..."
                rows="6"
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Validating..." : "Validate & Generate Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
