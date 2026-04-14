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

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18);
    scene.fog = new THREE.FogExp2(0x060c18, 0.0012);
    sceneRef.current = scene;

    // ── Camera ───────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 5000);
    camera.position.set(0, 70, 140);
    cameraRef.current = camera;

    // ── Renderer (cinematic quality) ─────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Enable physically correct lighting
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    // ── Controls (auto-rotate with interaction pause) ─────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 60;
    controls.maxDistance = 500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Pause auto-rotation when user grabs the scene, resume after 3 s
    let resumeTimer = null;
    const onUserInteract = () => {
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
    };
    renderer.domElement.addEventListener("pointerdown", onUserInteract);

    // ── Lighting ─────────────────────────────────────────────────────────
    // Sky / ground hemisphere light for warm ambient gradient
    const hemi = new THREE.HemisphereLight(0x1a2a4a, 0x0a0c10, 1.8);
    scene.add(hemi);

    // Key light (cool blue-white, top-right)
    const keyLight = new THREE.DirectionalLight(0xc0d8ff, 3.0);
    keyLight.position.set(120, 180, 90);
    scene.add(keyLight);

    // Fill light (softer, left)
    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.0);
    fillLight.position.set(-100, 60, 60);
    scene.add(fillLight);

    // Rim / back light (teal, gives glass brain depth)
    const rimLight = new THREE.DirectionalLight(0x00ffc8, 1.6);
    rimLight.position.set(-80, -30, -140);
    scene.add(rimLight);

    // Under-light (blue, illuminates brain from below)
    const underLight = new THREE.DirectionalLight(0x3366ff, 0.8);
    underLight.position.set(0, -120, 0);
    scene.add(underLight);

    // Dynamic tumor glow — point light (will be repositioned after mesh loads)
    const tumorGlow = new THREE.PointLight(0xff3300, 4.0, 120, 1.5);
    tumorGlow.position.set(0, 0, 0);
    scene.add(tumorGlow);
    // Store so we can reposition it after mesh loads
    scene._tumorGlow = tumorGlow;

    // ── Resize handler ────────────────────────────────────────────────────
    const resize = () => {
      const width  = mount.clientWidth  || 600;
      const height = mount.clientHeight || 480;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    // ── Render loop ───────────────────────────────────────────────────────
    let frameId = 0;
    const animate = () => {
      controls.update();
      // Pulse the tumor glow for a living effect
      const t = performance.now() * 0.001;
      tumorGlow.intensity = 3.5 + Math.sin(t * 2.0) * 1.0;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    loaderRef.current = new OBJLoader();

    return () => {
      clearTimeout(resumeTimer);
      renderer.domElement.removeEventListener("pointerdown", onUserInteract);
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

    // ── Materials ─────────────────────────────────────────────────────────
    // Tumor: shiny organic tissue with clearcoat + emissive glow
    const tumorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff2222,
      emissive: 0xff1100,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      depthWrite: true,
    });

    // Brain: true glass transmission (NOT just low opacity)
    const brainSolid = new THREE.MeshPhysicalMaterial({
      color: 0x99ccff,
      transparent: true,
      transmission: 0.72,      // glass-like light transmission
      ior: 1.38,               // index of refraction (brain ≈ soft tissue)
      thickness: 18,           // volume depth for refraction
      roughness: 0.12,
      metalness: 0.0,
      reflectivity: 0.25,
      envMapIntensity: 0.8,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const brainWireframe = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    brainMaterialsRef.current = { solid: brainSolid, wireframe: brainWireframe };

    // ── Helpers ───────────────────────────────────────────────────────────
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

    // Frame camera to fit ALL loaded objects (tumor + brain combined bounding box)
    const frameScene = (tumor, brain) => {
      const box = new THREE.Box3();
      if (tumor) box.expandByObject(tumor);
      if (brain) box.expandByObject(brain);
      if (box.isEmpty()) return;

      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      const distance = size * 1.4;

      controls.target.copy(center);
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.4,
        center.z + distance * 0.9,
      );
      camera.lookAt(center);
      controls.update();

      // Reposition tumor glow to the actual tumor mesh center
      if (tumor && scene._tumorGlow) {
        const tumorBox = new THREE.Box3().setFromObject(tumor);
        const tumorCenter = tumorBox.getCenter(new THREE.Vector3());
        scene._tumorGlow.position.copy(tumorCenter);
      }
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
