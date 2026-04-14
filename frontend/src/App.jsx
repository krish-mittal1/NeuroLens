import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const PATIENT_COPY = {
  low: {
    headline: "Lower-complexity finding",
    tone: "The scan suggests a more contained abnormal area, which may be easier to approach than high-risk cases.",
  },
  moderate: {
    headline: "Needs careful review",
    tone: "The scan suggests an area that is important enough to need careful planning and specialist review.",
  },
  high: {
    headline: "Needs urgent specialist attention",
    tone: "The scan suggests a more complex finding that may be close to sensitive brain functions.",
  },
  default: {
    headline: "Scan analysis ready",
    tone: "The scan has been converted into a 3D view and a planning summary for clinical review.",
  },
};

function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ═══════════════════════════════════════════════════════
   3D VIEWER
   ═══════════════════════════════════════════════════════ */
function Viewer({ tumorMeshUrl, brainMeshUrl }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const tumorRef = useRef(null);
  const brainRef = useRef(null);
  const loaderRef = useRef(null);
  const brainMaterialsRef = useRef(null);
  const [brainMode, setBrainMode] = useState("solid");
  const [meshLoading, setMeshLoading] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111b2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
    camera.position.set(0, 70, 140);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    const keyLight = new THREE.DirectionalLight(0xaaddff, 2.0);
    keyLight.position.set(120, 160, 90);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-80, 60, 60);
    const rimLight = new THREE.DirectionalLight(0x7effc3, 1.2);
    rimLight.position.set(-80, -20, -120);
    const bottomLight = new THREE.DirectionalLight(0x4488cc, 0.6);
    bottomLight.position.set(0, -100, 0);
    scene.add(ambient, keyLight, fillLight, rimLight, bottomLight);

    loaderRef.current = new OBJLoader();

    const resize = () => {
      const width = mount.clientWidth || 600;
      const height = mount.clientHeight || 480;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const loader = loaderRef.current;
    if (!scene || !camera || !controls || !loader) return undefined;

    const applyMaterial = (root, material) => {
      root.traverse((child) => {
        if (child.isMesh) child.material = material;
      });
    };

    const loadObj = (url, material, slot, renderOrder = 0) =>
      new Promise((resolve, reject) => {
        if (!url) {
          if (slot.current) { scene.remove(slot.current); slot.current = null; }
          resolve(null);
          return;
        }
        loader.load(
          `${url}?t=${Date.now()}`,
          (object) => {
            applyMaterial(object, material);
            object.renderOrder = renderOrder;
            if (slot.current) scene.remove(slot.current);
            slot.current = object;
            scene.add(object);
            resolve(object);
          },
          undefined,
          reject,
        );
      });

    const tumorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff5555, transparent: true, opacity: 0.95,
      roughness: 0.25, metalness: 0.05, emissive: 0x331111, emissiveIntensity: 0.3,
      depthWrite: true,
    });
    const brainSolid = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.18,
      roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide,
      emissive: 0x112244, emissiveIntensity: 0.2,
      depthWrite: false,
    });
    const brainWireframe = new THREE.MeshBasicMaterial({
      color: 0x66ddff, wireframe: true, transparent: true, opacity: 0.08,
      depthWrite: false,
    });
    brainMaterialsRef.current = { solid: brainSolid, wireframe: brainWireframe };

    // Frame camera to fit ALL loaded objects (tumor + brain combined bounding box)
    const frameScene = (tumor, brain) => {
      const box = new THREE.Box3();
      if (tumor) box.expandByObject(tumor);
      if (brain) box.expandByObject(brain);
      if (box.isEmpty()) return;

      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      const distance = size * 1.4; // always far enough back to see the full brain

      controls.target.copy(center);
      // Position camera at a comfortable 30-degree elevation, front-right view
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.4,
        center.z + distance * 0.9,
      );
      camera.lookAt(center);
      controls.update();
    };

    let cancelled = false;
    setMeshLoading(true);
    Promise.all([
      loadObj(resolveAssetUrl(tumorMeshUrl), tumorMaterial, tumorRef, 2),
      loadObj(resolveAssetUrl(brainMeshUrl), brainSolid, brainRef, 1),
    ]).then(([tumor, brain]) => {
      if (!cancelled) {
        frameScene(tumor, brain);
        setMeshLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to load mesh", error);
      if (!cancelled) setMeshLoading(false);
    });

    return () => { cancelled = true; };
  }, [tumorMeshUrl, brainMeshUrl]);

  // Handle brain mode changes
  useEffect(() => {
    const brain = brainRef.current;
    const mats = brainMaterialsRef.current;
    if (!brain || !mats) return;

    if (brainMode === "hidden") {
      brain.visible = false;
    } else {
      brain.visible = true;
      const mat = brainMode === "wireframe" ? mats.wireframe : mats.solid;
      brain.traverse((child) => {
        if (child.isMesh) child.material = mat;
      });
    }
  }, [brainMode]);

  return (
    <div className="viewer-wrapper">
      <div className="viewer" ref={mountRef} />
      {meshLoading && (
        <div className="viewer-loading-overlay">
          <span className="spinner" />
          <span>Loading 3D Mesh...</span>
        </div>
      )}
      <div className="viewer-toolbar">
        <button
          className={`toolbar-btn ${brainMode === "solid" ? "active" : ""}`}
          onClick={() => setBrainMode("solid")}
          title="Solid brain"
        >
          Solid
        </button>
        <button
          className={`toolbar-btn ${brainMode === "wireframe" ? "active" : ""}`}
          onClick={() => setBrainMode("wireframe")}
          title="Wireframe brain"
        >
          Wireframe
        </button>
        <button
          className={`toolbar-btn ${brainMode === "hidden" ? "active" : ""}`}
          onClick={() => setBrainMode("hidden")}
          title="Hide brain"
        >
          Tumor Only
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════ */
function Navbar({ currentPage, onNavigate, hasResults, modelStatus }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="logo-icon">🧠</span>
        NeuroLens
      </div>
      <div className="nav-links">
        <button
          className={`nav-link ${currentPage === "upload" ? "active" : ""}`}
          onClick={() => onNavigate("upload")}
        >
          Upload
        </button>
        {hasResults && (
          <>
            <button
              className={`nav-link ${currentPage === "results" ? "active" : ""}`}
              onClick={() => onNavigate("results")}
            >
              3D Viewer
            </button>
            <button
              className={`nav-link ${currentPage === "patient" ? "active" : ""}`}
              onClick={() => onNavigate("patient")}
            >
              Patient View
            </button>
            <button
              className={`nav-link ${currentPage === "doctor" ? "active" : ""}`}
              onClick={() => onNavigate("doctor")}
            >
              Doctor View
            </button>
          </>
        )}
      </div>
      <div className="nav-status">
        <span className="dot" />
        {modelStatus?.exists ? `Model: ${modelStatus.arch}` : "Ready"}
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════
   UPLOAD PAGE
   ═══════════════════════════════════════════════════════ */
function UploadPage({
  running, selectedFile, onFileChange, onAnalyzeUpload, onUseSample,
  cases, selectedCaseId, selectedModality, selectedSource,
  onSelectCase, onSelectModality, onSelectSource, onAnalyzeCase,
  onRefreshCases, loadingCases, modelStatus, status,
}) {
  return (
    <div className="page">
      <section className="hero-section">
        <span className="hero-badge">✦ Surgical Decision Intelligence</span>
        <h1 className="hero-title">MRI to 3D Insight in Seconds</h1>
        <p className="hero-subtitle">
          Upload a brain MRI scan and get an interactive 3D visualization with clinical metrics,
          risk assessment, and reasoning — presented differently for patients and doctors.
        </p>
      </section>

      <div className="upload-page">
        <div className="upload-grid">
          {/* Upload Card */}
          <div className="card">
            <span className="card-label">Upload</span>
            <h2 className="card-title">Scan File</h2>
            <p className="card-desc">
              Upload a DICOM zip archive, NIfTI volume, or NumPy file to analyze.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="scanFile">MRI scan file</label>
              <input
                id="scanFile"
                className="file-input"
                type="file"
                accept=".zip,.nii,.gz,.npy,.dcm"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              <p className="form-hint">
                {selectedFile ? `Selected: ${selectedFile.name}` : "Supports .zip, .nii, .nii.gz, .npy, .dcm"}
              </p>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" disabled={running} onClick={onAnalyzeUpload}>
                {running ? <><span className="spinner" /> Analyzing...</> : "Analyze Upload"}
              </button>
              <button className="btn btn-secondary" disabled={running} onClick={onUseSample}>
                Use Sample Case
              </button>
            </div>
            <p className={`status-text ${status.kind}`}>{status.text}</p>
          </div>

          {/* BraTS Card */}
          <div className="card">
            <span className="card-label green">Dataset</span>
            <h2 className="card-title">BraTS Cases</h2>
            <p className="card-desc">
              Select a real training case from your local BraTS2020 dataset.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="bratsCase">Training case</label>
              <select
                id="bratsCase"
                className="select-input"
                value={selectedCaseId}
                onChange={(e) => onSelectCase(e.target.value)}
              >
                <option value="">Select a BraTS case</option>
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>{c.case_id}</option>
                ))}
              </select>
              <p className="form-hint">
                {cases.length ? `${cases.length} cases loaded` : "Click Refresh to load cases"}
              </p>
            </div>
            <div className="row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="modality">Modality</label>
                <select id="modality" className="select-input" value={selectedModality} onChange={(e) => onSelectModality(e.target.value)}>
                  <option value="flair">FLAIR</option>
                  <option value="t1">T1</option>
                  <option value="t1ce">T1CE</option>
                  <option value="t2">T2</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="source">Mask source</label>
                <select id="source" className="select-input" value={selectedSource} onChange={(e) => onSelectSource(e.target.value)}>
                  <option value="ground_truth">Ground Truth</option>
                  <option value="model" disabled={!modelStatus?.exists}>MONAI Model</option>
                </select>
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" disabled={running || !selectedCaseId} onClick={onAnalyzeCase}>
                Analyze Case
              </button>
              <button className="btn btn-secondary" disabled={loadingCases} onClick={onRefreshCases}>
                {loadingCases ? "Refreshing..." : "Refresh Cases"}
              </button>
            </div>
            <div className={`model-badge ${modelStatus?.exists ? "active" : "inactive"}`}>
              {modelStatus?.exists ? `✓ Model: ${modelStatus.mode} (${modelStatus.arch})` : "○ Model not configured — using ground truth"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RESULTS PAGE (3D Viewer + Stats)
   ═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   2D SLICE VIEWER
   ═══════════════════════════════════════════════════════ */
function SliceViewer({ sliceInfo }) {
  const [axis, setAxis] = useState("axial");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const maxSlice = sliceInfo ? (sliceInfo[axis] || 1) - 1 : 0;

  // Reset slice index when axis changes
  useEffect(() => {
    const mid = Math.floor(maxSlice / 2);
    setSliceIndex(mid);
  }, [axis, maxSlice]);

  // Fetch slice image with debounce
  useEffect(() => {
    if (!sliceInfo) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const url = `${API_BASE}/api/slices/${axis}/${sliceIndex}`;
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error("Slice fetch failed");
          return r.blob();
        })
        .then((blob) => {
          setImgSrc(URL.createObjectURL(blob));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 50);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [axis, sliceIndex, sliceInfo]);

  if (!sliceInfo) return null;

  return (
    <div className="slice-viewer">
      <div className="slice-header">
        <h3>2D Slice Viewer</h3>
        <div className="axis-tabs">
          {["axial", "coronal", "sagittal"].map((a) => (
            <button
              key={a}
              className={`axis-tab ${axis === a ? "active" : ""}`}
              onClick={() => setAxis(a)}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="slice-display">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${axis} slice ${sliceIndex}`}
            className={`slice-image ${loading ? "loading" : ""}`}
          />
        ) : (
          <div className="slice-placeholder">Loading slice...</div>
        )}
      </div>
      <div className="slice-controls">
        <span className="slice-label">Slice</span>
        <input
          type="range"
          min={0}
          max={maxSlice}
          value={sliceIndex}
          onChange={(e) => setSliceIndex(Number(e.target.value))}
          className="slice-slider"
        />
        <span className="slice-index">{sliceIndex} / {maxSlice}</span>
      </div>
      <p className="slice-hint">
        {axis === "axial" && "Top-down view · Red overlay = detected tumor"}
        {axis === "coronal" && "Front-to-back view · Red overlay = detected tumor"}
        {axis === "sagittal" && "Side view · Red overlay = detected tumor"}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RESULTS PAGE (3D Viewer + Stats + Slice Viewer)
   ═══════════════════════════════════════════════════════ */
function ResultsPage({ result, onNavigate }) {
  const s = result.summary;
  const m = result.metrics;
  const riskClass = `risk-${(m?.risk_level || "low").toLowerCase()}`;

  return (
    <div className="page results-page">
      <div className="results-header">
        <h2>3D Analysis</h2>
        <div className="view-tabs">
          <button className="view-tab active">3D Viewer</button>
          <button className="view-tab" onClick={() => onNavigate("patient")}>Patient</button>
          <button className="view-tab" onClick={() => onNavigate("doctor")}>Doctor</button>
        </div>
      </div>

      <div className="results-dual">
        <div className="viewer-container">
          <Viewer tumorMeshUrl={result.mesh_url} brainMeshUrl={result.brain_mesh_url} />
        </div>
        <SliceViewer sliceInfo={result.slice_info} />
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-label">Region</span>
          <span className="stat-value">{s?.region || "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Volume</span>
          <span className="stat-value">{s?.volume || "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Dimensions</span>
          <span className="stat-value">{s?.dimensions || "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Laterality</span>
          <span className="stat-value">{s?.laterality || "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Depth</span>
          <span className="stat-value">{s?.depth || "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Risk Level</span>
          <span className={`stat-value ${riskClass}`}>{s?.risk_level || "—"}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PATIENT VIEW PAGE
   ═══════════════════════════════════════════════════════ */
function PatientPage({ result, onNavigate }) {
  const s = result.summary;
  const m = result.metrics;
  const riskKey = m?.risk_level?.toLowerCase() || "default";
  const copy = PATIENT_COPY[riskKey] || PATIENT_COPY.default;

  return (
    <div className="page results-page">
      <div className="results-header">
        <h2>Patient Report</h2>
        <div className="view-tabs">
          <button className="view-tab" onClick={() => onNavigate("results")}>3D Viewer</button>
          <button className="view-tab active">Patient</button>
          <button className="view-tab" onClick={() => onNavigate("doctor")}>Doctor</button>
        </div>
      </div>

      <section className="patient-section">
        <div className="patient-hero">
          <span className="tag">{copy.headline}</span>
          <h3>{s?.region || "Scan Analysis"}</h3>
          <p>{copy.tone}</p>
        </div>

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
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DOCTOR VIEW PAGE
   ═══════════════════════════════════════════════════════ */
function DoctorPage({ result, onNavigate }) {
  const s = result.summary;
  const m = result.metrics;
  const p = result.pipeline;
  const im = result.input_metadata;
  const reasoning = result.reasoning || [];
  const riskFactors = m?.risk_factors || [];

  return (
    <div className="page results-page">
      <div className="results-header">
        <h2>Clinical Console</h2>
        <div className="view-tabs">
          <button className="view-tab" onClick={() => onNavigate("results")}>3D Viewer</button>
          <button className="view-tab" onClick={() => onNavigate("patient")}>Patient</button>
          <button className="view-tab active">Doctor</button>
        </div>
      </div>

      <section className="doctor-section">
        <div className="doctor-grid">
          {/* Summary */}
          <div className="detail-card">
            <h3>Clinical Summary</h3>
            <p className="subtitle">Technical data extracted from the segmentation pipeline.</p>
            <dl className="detail-list">
              {Object.entries(s || {}).map(([key, value]) => (
                <div className="detail-item" key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="meta-list" style={{ marginTop: 18 }}>
              <div className="meta-row">Volume (cm³): <span>{m?.tumor_volume_cm3 ?? "n/a"}</span></div>
              <div className="meta-row">Region function: <span>{m?.region_function || "n/a"}</span></div>
              <div className="meta-row">Midline distance: <span>{m?.midline_distance_mm ?? "n/a"} mm</span></div>
              <div className="meta-row">Centroid: <span>{(m?.centroid_voxel || []).join(", ") || "n/a"}</span></div>
            </div>
          </div>

          {/* Focus */}
          <div className="detail-card">
            <h3>Planning Focus</h3>
            <p className="subtitle">High-signal cues for the surgical workflow.</p>
            <div className="focus-grid">
              <div className="focus-item">
                <span className="label">Laterality</span>
                <span className="value">{s?.laterality || "n/a"}</span>
              </div>
              <div className="focus-item">
                <span className="label">Risk Level</span>
                <span className="value">{s?.risk_level || "n/a"}</span>
              </div>
              <div className="focus-item">
                <span className="label">Dimensions</span>
                <span className="value">{s?.dimensions || "n/a"}</span>
              </div>
              <div className="focus-item">
                <span className="label">Depth</span>
                <span className="value">{s?.depth || "n/a"}</span>
              </div>
              <div className="focus-item">
                <span className="label">Pipeline</span>
                <span className="value">{p?.segmentation_mode || "n/a"}</span>
              </div>
              <div className="focus-item">
                <span className="label">Voxel Spacing</span>
                <span className="value">{(p?.voxel_spacing_mm || []).join(" × ") || "n/a"} mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="detail-card reasoning-section">
          <h3>Clinical Reasoning</h3>
          <p className="subtitle">Step-by-step justification for the reported summary.</p>

          {riskFactors.length > 0 && (
            <div className="risk-chips">
              {riskFactors.map((f) => (
                <span key={f} className="risk-chip">{f}</span>
              ))}
            </div>
          )}

          <div className="reasoning-steps">
            {reasoning.map((step) => (
              <div key={step.step} className="reasoning-step">
                <div className="step-header">
                  <span className="step-number">{step.step}</span>
                  <span className="step-title">{step.title}</span>
                  <span className="confidence-badge">{step.confidence}</span>
                </div>
                <p className="step-detail">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [currentPage, setCurrentPage] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [bratsCases, setBratsCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedModality, setSelectedModality] = useState("flair");
  const [selectedSource, setSelectedSource] = useState("ground_truth");
  const [running, setRunning] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [status, setStatus] = useState({ text: "Ready", kind: "idle" });
  const [result, setResult] = useState({
    summary: {}, metrics: {}, reasoning: [], pipeline: {},
    input_metadata: {}, mesh_url: null, brain_mesh_url: null, slice_info: null,
  });

  const hasResults = Boolean(result.mesh_url);

  const handleResult = (data) => {
    setResult({
      summary: data.summary || {},
      metrics: data.metrics || {},
      reasoning: data.reasoning || [],
      pipeline: data.pipeline || {},
      input_metadata: data.input_metadata || {},
      mesh_url: data.mesh_url || null,
      brain_mesh_url: data.brain_mesh_url || null,
      slice_info: data.slice_info || null,
    });
    setCurrentPage("results");
  };

  const runAnalysis = async (useSample) => {
    setRunning(true);
    setStatus({ text: "Running MRI analysis pipeline...", kind: "idle" });
    try {
      let response;
      if (useSample) {
        response = await fetch(`${API_BASE}/api/sample-analysis`);
      } else {
        if (!selectedFile) throw new Error("Choose a scan file or use the sample case.");
        const formData = new FormData();
        formData.append("file", selectedFile);
        response = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: formData });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Analysis failed");
      handleResult(data);
      setStatus({ text: "Analysis complete.", kind: "success" });
    } catch (error) {
      console.error(error);
      setStatus({ text: error.message, kind: "error" });
    } finally {
      setRunning(false);
    }
  };

  const loadBratsCases = async () => {
    setLoadingCases(true);
    try {
      const response = await fetch(`${API_BASE}/api/brats-cases?limit=50`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to load BraTS cases");
      setBratsCases(data.cases || []);
      if (!selectedCaseId && data.cases?.length) setSelectedCaseId(data.cases[0].case_id);
    } catch (error) {
      console.error(error);
      setStatus({ text: error.message, kind: "error" });
    } finally {
      setLoadingCases(false);
    }
  };

  const loadModelStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/model-status`);
      const data = await response.json();
      if (response.ok) setModelStatus(data.model || null);
    } catch (error) {
      console.error(error);
    }
  };

  const runBratsCase = async () => {
    if (!selectedCaseId) {
      setStatus({ text: "Select a BraTS case first.", kind: "error" });
      return;
    }
    setRunning(true);
    setStatus({ text: `Loading BraTS case ${selectedCaseId}...`, kind: "idle" });
    try {
      const params = new URLSearchParams({ modality: selectedModality, source: selectedSource });
      const response = await fetch(`${API_BASE}/api/brats-analysis/${selectedCaseId}?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "BraTS analysis failed");
      handleResult(data);
      setStatus({ text: `Case ${selectedCaseId} analyzed.`, kind: "success" });
    } catch (error) {
      console.error(error);
      setStatus({ text: error.message, kind: "error" });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadBratsCases();
    loadModelStatus();
  }, []);

  return (
    <>
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        hasResults={hasResults}
        modelStatus={modelStatus}
      />
      <main className="app-container">
        {currentPage === "upload" && (
          <UploadPage
            running={running}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            onAnalyzeUpload={() => runAnalysis(false)}
            onUseSample={() => runAnalysis(true)}
            cases={bratsCases}
            selectedCaseId={selectedCaseId}
            selectedModality={selectedModality}
            selectedSource={selectedSource}
            onSelectCase={setSelectedCaseId}
            onSelectModality={setSelectedModality}
            onSelectSource={setSelectedSource}
            onAnalyzeCase={runBratsCase}
            onRefreshCases={loadBratsCases}
            loadingCases={loadingCases}
            modelStatus={modelStatus}
            status={status}
          />
        )}
        {currentPage === "results" && <ResultsPage result={result} onNavigate={setCurrentPage} />}
        {currentPage === "patient" && <PatientPage result={result} onNavigate={setCurrentPage} />}
        {currentPage === "doctor" && <DoctorPage result={result} onNavigate={setCurrentPage} />}
      </main>
    </>
  );
}
