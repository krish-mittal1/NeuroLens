import { useNavigate } from "react-router-dom";
import brainImg from "../components/brainlandingpage.png";
import logoImg from "../components/logo.png";
import { SessionProvider } from "../features/SessionContext";
import RiskEstimator from "../features/RiskEstimator";
import MRIViewer from "../features/MRIViewer";
import AnatomyExplorer from "../features/AnatomyExplorer";
import ClinicalChat from "../features/ClinicalChat";
import SessionDashboard from "../features/SessionDashboard";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <SessionProvider>
      <div className="lp-wrapper">
        {/* Hero Section */}
        <div className="lp-root template-bg">

          {/* Template Header Navbar */}
          <header className="lp-header">
            <div className="lp-brand">
              <img src={logoImg} alt="NeuroLens" className="lp-logo" />
              NEUROLENS
            </div>
          </header>

          {/* Grid Background Effect */}
          <div className="lp-grid"></div>

          {/* Background "Revolutionize" */}
          <div className="lp-bg-title-top" aria-hidden="true">
            Revolutionize
          </div>

          {/* Foreground Center Brain Image */}
          <div className="lp-brain-stage">
            <img
              src={brainImg}
              alt="3D brain visualization"
              className="lp-brain-img"
              draggable={false}
            />
          </div>

          {/* Foreground "Brain Care" */}
          <div className="lp-bg-title-bottom" aria-hidden="true">
            Brain Care
          </div>

          {/* Floating text - Left */}
          <div className="lp-text-float lp-text-left">
            Where AI meets<br/>Holistic Brain Health
          </div>

          {/* Floating text - Right */}
          <div className="lp-text-float lp-text-right">
            AI enhances<br/>healthcare through<br/>personalized
          </div>

          {/* Bottom Left glass card */}
          <div className="lp-card-bottom-left">
            {/* Header */}
            <div className="lp-metric-top">
              <div className="lp-status-dot" />
              <span className="lp-card-val">Tumor Detected</span>
            </div>

            <p className="lp-hud-sub">High-precision 3D segmentation</p>

            {/* Risk bar chart */}
            <div className="lp-chart">
              <div className="lp-chart-row">
                <span className="lp-chart-label">Infiltration</span>
                <div className="lp-bar-track">
                  <div className="lp-bar" style={{ width: "72%", background: "#F87171" }} />
                </div>
                <span className="lp-chart-pct">72%</span>
              </div>
              <div className="lp-chart-row">
                <span className="lp-chart-label">Edema</span>
                <div className="lp-bar-track">
                  <div className="lp-bar" style={{ width: "55%", background: "#FBBF24" }} />
                </div>
                <span className="lp-chart-pct">55%</span>
              </div>
              <div className="lp-chart-row">
                <span className="lp-chart-label">Necrosis</span>
                <div className="lp-bar-track">
                  <div className="lp-bar" style={{ width: "38%", background: "#38BDF8" }} />
                </div>
                <span className="lp-chart-pct">38%</span>
              </div>
            </div>

            {/* EKG line */}
            <div className="lp-ekg-row">
              <svg viewBox="0 0 140 28" fill="none" className="lp-ekg-svg">
                <polyline
                  points="0,14 16,14 22,4 28,24 34,14 50,14 56,2 62,26 68,14 84,14 90,8 96,20 102,14 120,14 126,6 132,22 140,14"
                  stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              <span className="lp-ekg-tag">Active scan</span>
            </div>
          </div>

          {/* App CTAs placed neatly at bottom right */}
          <div className="lp-cta-action">
            <button className="lp-btn-primary" onClick={() => navigate("/doctor")}>
              Doctor View
            </button>
            <button className="lp-btn-ghost" onClick={() => navigate("/patient")}>
              Patient View
            </button>
          </div>

        </div>

        {/* Interactive Features Section */}
        <div style={{ background: "#0B1220" }}>
          <RiskEstimator />
          <AnatomyExplorer />
          <ClinicalChat />
          <SessionDashboard />
        </div>
      </div>
    </SessionProvider>
  );
}
