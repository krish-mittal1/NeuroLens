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
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function Viewer({ tumorMeshUrl, brainMeshUrl }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const tumorRef = useRef(null);
  const brainRef = useRef(null);
  const loaderRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09111f);
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

    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    const keyLight = new THREE.DirectionalLight(0x8fdfff, 1.7);
    keyLight.position.set(120, 160, 90);
    const rimLight = new THREE.DirectionalLight(0x7effc3, 0.75);
    rimLight.position.set(-80, -20, -120);
    scene.add(ambient, keyLight, rimLight);

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
    if (!scene || !camera || !controls || !loader) {
      return undefined;
    }

    const applyMaterial = (root, material) => {
      root.traverse((child) => {
        if (child.isMesh) {
          child.material = material;
        }
      });
    };

    const loadObj = (url, material, slot) =>
      new Promise((resolve, reject) => {
        if (!url) {
          if (slot.current) {
            scene.remove(slot.current);
            slot.current = null;
          }
          resolve(null);
          return;
        }

        loader.load(
          `${url}?t=${Date.now()}`,
          (object) => {
            applyMaterial(object, material);
            if (slot.current) {
              scene.remove(slot.current);
            }
            slot.current = object;
            scene.add(object);
            resolve(object);
          },
          undefined,
          reject,
        );
      });

    const tumorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.92,
      roughness: 0.28,
      metalness: 0.05,
      transmission: 0.08,
    });

    const brainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x67c6ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.4,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const frameObject = (object) => {
      if (!object) {
        return;
      }
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      controls.target.copy(center);
      camera.position.copy(center.clone().add(new THREE.Vector3(size * 0.8, size * 0.6, size * 1.2)));
      camera.lookAt(center);
      controls.update();
    };

    let cancelled = false;

    Promise.all([
      loadObj(resolveAssetUrl(tumorMeshUrl), tumorMaterial, tumorRef),
      loadObj(resolveAssetUrl(brainMeshUrl), brainMaterial, brainRef),
    ])
      .then(([tumor]) => {
        if (!cancelled) {
          frameObject(tumor);
        }
      })
      .catch((error) => {
        console.error("Failed to load mesh", error);
      });

    return () => {
      cancelled = true;
    };
  }, [tumorMeshUrl, brainMeshUrl]);

  return <div className="viewer" ref={mountRef} />;
}

function UploadPanel({ running, selectedFile, onFileChange, onAnalyzeUpload, onUseSample, status }) {
  return (
    <section className="panel controls">
      <div className="panel-header">
        <h2>Upload Scan</h2>
        <p>Upload DICOM zip, NIfTI volume, or use the sample case to preview the workflow.</p>
      </div>
      <div className="field">
        <label htmlFor="scanFile">MRI scan file</label>
        <input
          id="scanFile"
          type="file"
          accept=".zip,.nii,.gz,.npy,.dcm"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
        <small>{selectedFile ? `Selected: ${selectedFile.name}` : "DICOM series should be uploaded as a zip archive."}</small>
      </div>
      <div className="actions">
        <button type="button" disabled={running} onClick={onAnalyzeUpload}>
          Analyze Upload
        </button>
        <button type="button" className="secondary" disabled={running} onClick={onUseSample}>
          Use Sample Case
        </button>
      </div>
      <p className={`status ${status.kind}`}>{status.text}</p>
    </section>
  );
}

function DataSourcePanel({
  cases,
  selectedCaseId,
  selectedModality,
  selectedSource,
  onSelectCase,
  onSelectModality,
  onSelectSource,
  onAnalyzeCase,
  onRefreshCases,
  loadingCases,
  running,
  modelStatus,
}) {
  return (
    <section className="panel source-panel">
      <div className="panel-header">
        <h2>Local BraTS Cases</h2>
        <p>Use a real training case directly from the downloaded BraTS dataset.</p>
      </div>
      <div className="source-actions">
        <button type="button" className="secondary" disabled={loadingCases} onClick={onRefreshCases}>
          {loadingCases ? "Refreshing..." : "Refresh Cases"}
        </button>
      </div>
      <div className="field">
        <label htmlFor="bratsCase">BraTS case</label>
        <select id="bratsCase" value={selectedCaseId} onChange={(event) => onSelectCase(event.target.value)}>
          <option value="">Select a BraTS training case</option>
          {cases.map((item) => (
            <option key={item.case_id} value={item.case_id}>
              {item.case_id}
            </option>
          ))}
        </select>
        <small>{cases.length ? `${cases.length} cases loaded from backend dataset root.` : "No cases loaded yet."}</small>
      </div>
      <div className="dual-field">
        <div className="field">
          <label htmlFor="bratsModality">Viewer modality</label>
          <select id="bratsModality" value={selectedModality} onChange={(event) => onSelectModality(event.target.value)}>
            <option value="flair">FLAIR</option>
            <option value="t1">T1</option>
            <option value="t1ce">T1CE</option>
            <option value="t2">T2</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="bratsSource">Mask source</label>
          <select id="bratsSource" value={selectedSource} onChange={(event) => onSelectSource(event.target.value)}>
            <option value="ground_truth">Ground Truth Seg</option>
            <option value="model" disabled={!modelStatus?.exists}>
              MONAI Model
            </option>
          </select>
        </div>
      </div>
      <small>
        Model status:{" "}
        {modelStatus?.exists
          ? `configured (${modelStatus.mode})`
          : "not configured yet - ground truth mode is active"}
      </small>
      <div className="actions">
        <button type="button" disabled={running || !selectedCaseId} onClick={onAnalyzeCase}>
          Analyze BraTS Case
        </button>
      </div>
    </section>
  );
}

function PatientView({ summary, metrics }) {
  const riskKey = metrics?.risk_level?.toLowerCase() || "default";
  const copy = PATIENT_COPY[riskKey] || PATIENT_COPY.default;
  const region = summary?.region || "the analyzed area";
  const volume = summary?.volume || "not available";
  const depth = summary?.depth || "not available";

  return (
    <section className="role-layout patient-layout">
      <article className="panel patient-hero-card">
        <div className="panel-header">
          <h2>Patient View</h2>
          <p>Simple language summary for the person receiving care.</p>
        </div>
        <div className="patient-headline">
          <span className="patient-tag">{copy.headline}</span>
          <h3>{region}</h3>
          <p>{copy.tone}</p>
        </div>
        <div className="patient-grid">
          <div className="patient-card">
            <span>Observed area</span>
            <strong>{region}</strong>
            <p>The system mapped the finding to this part of the brain.</p>
          </div>
          <div className="patient-card">
            <span>Estimated size</span>
            <strong>{volume}</strong>
            <p>This is an approximate measurement from the segmented scan.</p>
          </div>
          <div className="patient-card">
            <span>Depth</span>
            <strong>{depth}</strong>
            <p>This helps estimate how close the area is to the outer brain surface.</p>
          </div>
          <div className="patient-card">
            <span>Next step</span>
            <strong>Doctor review</strong>
            <p>A specialist should combine this with symptoms and other tests before making decisions.</p>
          </div>
        </div>
      </article>
    </section>
  );
}

function DoctorSummary({ summary, pipeline, inputMetadata, metrics }) {
  const summaryEntries = Object.entries(summary || {});
  const metaLines = [
    `Pipeline mode: ${pipeline?.mode || "unknown"}`,
    `Input type: ${pipeline?.input_type || "unknown"}`,
    `Segmentation: ${pipeline?.segmentation_mode || "unknown"}`,
    `Voxel spacing (mm): ${(pipeline?.voxel_spacing_mm || []).join(", ") || "n/a"}`,
    `Slices: ${inputMetadata?.slice_count ?? "n/a"}`,
    `Patient ID: ${inputMetadata?.patient_id || "demo"}`,
  ];

  const metricLines = [
    `Volume (cm3): ${metrics?.tumor_volume_cm3 ?? "n/a"}`,
    `Region function: ${metrics?.region_function || "n/a"}`,
    `Midline distance (mm): ${metrics?.midline_distance_mm ?? "n/a"}`,
    `Centroid voxel: ${(metrics?.centroid_voxel || []).join(", ") || "n/a"}`,
  ];

  return (
    <article className="panel summary-panel">
      <div className="panel-header">
        <h2>Doctor View</h2>
        <p>Technical summary with planning data, imaging metadata, and model output context.</p>
      </div>
      <dl className="summary-list">
        {summaryEntries.map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll("_", " ")}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="meta-block">
        {metricLines.map((line) => (
          <div key={line} className="meta-line">
            {line}
          </div>
        ))}
        {metaLines.map((line) => (
          <div key={line} className="meta-line">
            {line}
          </div>
        ))}
      </div>
    </article>
  );
}

function ReasoningTrace({ steps, riskFactors }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Clinical Reasoning</h2>
        <p>Transparent step-by-step justification for the reported summary.</p>
      </div>
      {riskFactors?.length > 0 ? (
        <div className="risk-strip">
          {riskFactors.map((factor) => (
            <span key={factor} className="risk-chip">
              {factor}
            </span>
          ))}
        </div>
      ) : null}
      <div className="reasoning-list">
        {(steps || []).map((step) => (
          <article key={step.step} className="reasoning-step">
            <header>
              <h3>
                {step.step}. {step.title}
              </h3>
              <span className="pill">{step.confidence}</span>
            </header>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [bratsCases, setBratsCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedModality, setSelectedModality] = useState("flair");
  const [selectedSource, setSelectedSource] = useState("ground_truth");
  const [activeView, setActiveView] = useState("patient");
  const [running, setRunning] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [status, setStatus] = useState({ text: "Ready", kind: "idle" });
  const [result, setResult] = useState({
    summary: {},
    metrics: {},
    reasoning: [],
    pipeline: {},
    input_metadata: {},
    mesh_url: null,
    brain_mesh_url: null,
  });

  const runAnalysis = async (useSample) => {
    setRunning(true);
    setStatus({ text: "Running MRI analysis pipeline...", kind: "idle" });

    try {
      let response;
      if (useSample) {
        response = await fetch(`${API_BASE}/api/sample-analysis`);
      } else {
        if (!selectedFile) {
          throw new Error("Choose a scan file or use the sample case.");
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        response = await fetch(`${API_BASE}/api/analyze`, {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed");
      }

      setResult({
        summary: data.summary || {},
        metrics: data.metrics || {},
        reasoning: data.reasoning || [],
        pipeline: data.pipeline || {},
        input_metadata: data.input_metadata || {},
        mesh_url: data.mesh_url || null,
        brain_mesh_url: data.brain_mesh_url || null,
      });
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
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load BraTS cases");
      }
      setBratsCases(data.cases || []);
      if (!selectedCaseId && data.cases?.length) {
        setSelectedCaseId(data.cases[0].case_id);
      }
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
      if (response.ok) {
        setModelStatus(data.model || null);
      }
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
      const params = new URLSearchParams({
        modality: selectedModality,
        source: selectedSource,
      });
      const response = await fetch(`${API_BASE}/api/brats-analysis/${selectedCaseId}?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "BraTS analysis failed");
      }

      setResult({
        summary: data.summary || {},
        metrics: data.metrics || {},
        reasoning: data.reasoning || [],
        pipeline: data.pipeline || {},
        input_metadata: data.input_metadata || {},
        mesh_url: data.mesh_url || null,
        brain_mesh_url: data.brain_mesh_url || null,
      });
      setStatus({ text: `BraTS case ${selectedCaseId} analyzed successfully.`, kind: "success" });
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
    <main className="shell">
      <section className="hero hero-grid">
        <div>
          <p className="eyebrow">NeuroLens</p>
          <h1>Role-based MRI analysis for patients and doctors</h1>
          <p className="lede">
            One scan, two experiences: a simple explanation for the patient and a full clinical reasoning view
            for the doctor.
          </p>
        </div>
        <div className="hero-note panel">
          <span className="hero-note-label">Current Mode</span>
          <strong>{activeView === "patient" ? "Patient-friendly report" : "Doctor planning console"}</strong>
          <p>
            Switch between plain-language communication and technical reasoning without rerunning the analysis.
          </p>
        </div>
      </section>

      <section className="top-grid">
        <div className="stack-grid">
          <UploadPanel
            running={running}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            onAnalyzeUpload={() => runAnalysis(false)}
            onUseSample={() => runAnalysis(true)}
            status={status}
          />
          <DataSourcePanel
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
            running={running}
            modelStatus={modelStatus}
          />
        </div>

        <article className="panel viewer-panel">
          <div className="panel-header">
            <h2>3D Viewer</h2>
            <p>Shared anatomical view used by both roles.</p>
          </div>
          <Viewer tumorMeshUrl={result.mesh_url} brainMeshUrl={result.brain_mesh_url} />
        </article>
      </section>

      <section className="view-switch">
        <button
          type="button"
          className={activeView === "patient" ? "view-tab active" : "view-tab"}
          onClick={() => setActiveView("patient")}
        >
          Patient View
        </button>
        <button
          type="button"
          className={activeView === "doctor" ? "view-tab active" : "view-tab"}
          onClick={() => setActiveView("doctor")}
        >
          Doctor View
        </button>
      </section>

      {activeView === "patient" ? (
        <PatientView summary={result.summary} metrics={result.metrics} />
      ) : (
        <section className="role-layout doctor-layout">
          <div className="grid">
            <DoctorSummary
              summary={result.summary}
              pipeline={result.pipeline}
              inputMetadata={result.input_metadata}
              metrics={result.metrics}
            />
            <article className="panel doctor-callout">
              <div className="panel-header">
                <h2>Clinical Focus</h2>
                <p>High-signal planning cues for the specialist workflow.</p>
              </div>
              <div className="doctor-focus-list">
                <div className="focus-card">
                  <span>Laterality</span>
                  <strong>{result.summary?.laterality || "n/a"}</strong>
                </div>
                <div className="focus-card">
                  <span>Risk level</span>
                  <strong>{result.summary?.risk_level || "n/a"}</strong>
                </div>
                <div className="focus-card">
                  <span>Dimensions</span>
                  <strong>{result.summary?.dimensions || "n/a"}</strong>
                </div>
                <div className="focus-card">
                  <span>Depth</span>
                  <strong>{result.summary?.depth || "n/a"}</strong>
                </div>
              </div>
            </article>
          </div>
          <ReasoningTrace steps={result.reasoning} riskFactors={result.metrics?.risk_factors} />
        </section>
      )}
    </main>
  );
}
