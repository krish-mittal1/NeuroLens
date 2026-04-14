import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../AppContext";
import logoImg from "./logo.png";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasResults, modelStatus } = useApp();
  const path = location.pathname;

  if (path === "/") {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <img src={logoImg} alt="NeuroLens" className="nav-logo" />
        NeuroLens
      </div>
      <div className="nav-links">
        <button
          className={`nav-link ${path === "/doctor" || path === "/doctor/upload" ? "active" : ""}`}
          onClick={() => navigate("/doctor")}
        >
          Upload
        </button>
        {hasResults && (
          <>
            <button
              className={`nav-link ${path === "/doctor/results" ? "active" : ""}`}
              onClick={() => navigate("/doctor/results")}
            >
              3D Viewer
            </button>
            <button
              className={`nav-link ${path === "/patient" ? "active" : ""}`}
              onClick={() => navigate("/patient")}
            >
              Patient View
            </button>
            <button
              className={`nav-link ${path === "/doctor/clinical" ? "active" : ""}`}
              onClick={() => navigate("/doctor/clinical")}
            >
              Doctor View
            </button>
          </>
        )}
      </div>
      <div className="nav-status">
        <span className="dot" />
        <span>{modelStatus?.exists ? `Model: ${modelStatus.arch}` : "Ready"}</span>
      </div>
    </nav>
  );
}
