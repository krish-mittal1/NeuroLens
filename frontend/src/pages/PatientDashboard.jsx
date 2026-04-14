import { useNavigate } from "react-router-dom";
import { useApp, PATIENT_COPY } from "../AppContext";
import SliceViewer from "../components/SliceViewer";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { result, hasResults } = useApp();
  const s = result.summary;
  const m = result.metrics;
  const riskKey = m?.risk_level?.toLowerCase() || "default";
  const copy = PATIENT_COPY[riskKey] || PATIENT_COPY.default;

  if (!hasResults) {
    return (
      <div className="page results-page">
        <div className="empty-state">
          <p className="empty-title">No scan analyzed yet</p>
          <p className="empty-desc">Run an analysis from the Doctor View first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/doctor")}>
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page results-page">
      <section className="patient-section">
        <div className="patient-hero">
          <span className="tag">{copy.headline}</span>
          <h3>{s?.region || "Scan Analysis"}</h3>
          <p>{copy.tone}</p>
        </div>

        <div className="patient-body">
          <div className="info-grid">
            <div className="info-card">
              <span className="label">Observed area</span>
              <span className="value">{s?.region || "—"}</span>
              <span className="desc">The system mapped the finding to this part of the brain.</span>
            </div>
            <div className="info-card">
              <span className="label">Estimated size</span>
              <span className="value">{s?.volume || "—"}</span>
              <span className="desc">This is an approximate measurement from the segmented scan.</span>
            </div>
            <div className="info-card">
              <span className="label">Depth from surface</span>
              <span className="value">{s?.depth || "—"}</span>
              <span className="desc">This helps estimate how close the area is to the outer brain surface.</span>
            </div>
            <div className="info-card">
              <span className="label">What's next</span>
              <span className="value">Doctor Review</span>
              <span className="desc">A specialist should combine this with symptoms and other tests before making decisions.</span>
            </div>
          </div>

          {result.slice_info && (
            <div className="patient-slice">
              <SliceViewer sliceInfo={result.slice_info} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
