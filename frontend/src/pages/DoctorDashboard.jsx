import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../AppContext";
import Viewer from "../components/Viewer";
import SliceViewer from "../components/SliceViewer";
import ValidationModal from "../components/ValidationModal";
import PatientReport from "../components/PatientReport";

/* ── Gemini API ── */
const GEMINI_API_KEY = "AIzaSyCZd8tEkKsoZdlBNwAjwtQClVPiDZxMGOY";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function buildScanContext(result) {
  const s = result.summary || {};
  const m = result.metrics || {};
  const p = result.pipeline || {};
  const r = result.reasoning || [];
  return `You are NeuroLens AI — a strictly scoped medical assistant embedded in the NeuroLens brain MRI analysis platform.

STRICT RULES — FOLLOW WITHOUT EXCEPTION:
1. Only answer questions directly related to: brain MRI scans, brain tumor segmentation, and the specific scan report below.
2. If the user asks ANYTHING outside MRI/neurology/this report, respond ONLY with: "I can only assist with questions about brain MRI scans and this scan report."
3. Do NOT volunteer extra information beyond what is asked.
4. Do NOT fabricate values or conclusions not present in the report data.
5. Do NOT give treatment plans or medication recommendations.
6. Always recommend consulting a certified specialist for clinical decisions.
7. Keep answers concise and strictly on-topic.

=== SCAN REPORT ===
SUMMARY:
- Region: ${s.region || "N/A"}
- Volume: ${s.volume || "N/A"}
- Dimensions: ${s.dimensions || "N/A"}
- Laterality: ${s.laterality || "N/A"}
- Depth from surface: ${s.depth || "N/A"}
- Risk Level: ${s.risk_level || "N/A"}

CLINICAL METRICS:
- Tumor volume (cm³): ${m.tumor_volume_cm3 ?? "N/A"}
- Region function: ${m.region_function || "N/A"}
- Midline distance: ${m.midline_distance_mm ?? "N/A"} mm
- Centroid voxel: ${(m.centroid_voxel || []).join(", ") || "N/A"}
- Risk factors: ${(m.risk_factors || []).join(", ") || "none"}

PIPELINE:
- Segmentation mode: ${p.segmentation_mode || "N/A"}
- Voxel spacing: ${(p.voxel_spacing_mm || []).join(" × ") || "N/A"} mm

CLINICAL REASONING:
${r.map((step) => `Step ${step.step} - ${step.title} (${step.confidence}): ${step.detail}`).join("\n") || "No reasoning steps available."}
=== END OF REPORT ===

Answer only what is asked. Do not add unsolicited information.`;
}

async function askGemini(messages, systemContext) {
  // Only send real conversation turns — skip initial hardcoded UI messages
  const realMessages = messages.filter((m) => !m.initial);
  const contents = realMessages.map((m) => ({
    role: m.role === "ai" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  // Gemini needs at least 1 user message
  if (!contents.some((c) => c.role === "user")) return "Please ask a question about the scan report.";
  const body = {
    system_instruction: { parts: [{ text: systemContext }] },
    contents,
    generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
  };
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Gemini API error");
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";
}

/* ── Upload Tab ─────────────────────────────────────── */
function UploadTab() {
  const navigate = useNavigate();
  const {
    running, selectedFile, setSelectedFile,
    bratsCases, selectedCaseId, setSelectedCaseId,
    selectedModality, setSelectedModality,
    selectedSource, setSelectedSource,
    loadingCases, modelStatus, status,
    runAnalysis, runBratsCase, loadBratsCases,
  } = useApp();

  const handleAnalyzeUpload = async () => {
    const ok = await runAnalysis(false);
    if (ok) navigate("/doctor/results");
  };

  const handleUseSample = async () => {
    const ok = await runAnalysis(true);
    if (ok) navigate("/doctor/results");
  };

  const handleAnalyzeCase = async () => {
    const ok = await runBratsCase();
    if (ok) navigate("/doctor/results");
  };

  return (
    <div className="dd-upload-layout">
      {/* ── Left: Upload card only ── */}
      <div className="dd-left-panel">
        <div className="dd-panel-card">
          <span className="card-label">Upload</span>
          <h2 className="card-title">Scan File</h2>
          <p className="card-desc">
            Upload a DICOM zip archive, NIfTI volume, or NumPy file to analyze.
          </p>

          {/* Drop zone */}
          <label className="dd-dropzone" htmlFor="scanFile">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="dd-dropzone-title">Drag &amp; drop or click to upload</span>
            <span className="dd-dropzone-sub">
              {selectedFile ? selectedFile.name : "Supports DICOM, .zip, .nii, .npy"}
            </span>
            <input
              id="scanFile"
              type="file"
              accept=".zip,.nii,.gz,.npy,.dcm"
              style={{ display: "none" }}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="dd-controls-section">
            <p className="dd-controls-label">BraTS Dataset</p>
            <div className="form-group">
              <select
                className="select-input"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
              >
                <option value="">Select a BraTS case</option>
                {bratsCases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>{c.case_id}</option>
                ))}
              </select>
            </div>
            <div className="row-2">
              <div className="form-group">
                <label className="form-label">Modality</label>
                <select className="select-input" value={selectedModality} onChange={(e) => setSelectedModality(e.target.value)}>
                  <option value="flair">FLAIR</option>
                  <option value="t1">T1</option>
                  <option value="t1ce">T1CE</option>
                  <option value="t2">T2</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mask source</label>
                <select className="select-input" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
                  <option value="ground_truth">Ground Truth</option>
                  <option value="model" disabled={!modelStatus?.exists}>MONAI Model</option>
                </select>
              </div>
            </div>
          </div>

          <div className="dd-btn-stack">
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={running} onClick={handleAnalyzeUpload}>
              {running ? <><span className="spinner" /> Analyzing...</> : "Analyze Upload"}
            </button>
            <button className="btn btn-secondary" style={{ width: "100%" }} disabled={running} onClick={handleUseSample}>
              Use Sample Case
            </button>
            <button className="btn btn-secondary" style={{ width: "100%" }} disabled={running || !selectedCaseId} onClick={handleAnalyzeCase}>
              Analyze BraTS Case
            </button>
            <button className="btn btn-secondary" style={{ width: "100%" }} disabled={loadingCases} onClick={loadBratsCases}>
              {loadingCases ? "Refreshing..." : "Refresh Cases"}
            </button>
          </div>

          <p className={`status-text ${status.kind}`}>{status.text}</p>

          <div className={`model-badge ${modelStatus?.exists ? "active" : "inactive"}`}>
            {modelStatus?.exists
              ? `✓ Model: ${modelStatus.mode} (${modelStatus.arch})`
              : "○ Model not configured — using ground truth"}
          </div>
        </div>
      </div>

      {/* ── Center: placeholder viewer ── */}
      <div className="dd-center-panel">
        <div className="dd-viewer-placeholder">
          <div className="dd-viewer-placeholder-inner">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </svg>
            <p>3D Brain Viewer</p>
            <span>Upload and analyze a scan to view</span>
          </div>
        </div>
      </div>

      {/* ── Right: summary + AI explanation placeholders ── */}
      <div className="dd-right-panel">
        <div className="dd-panel-card">
          <div className="dd-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <h3>Surgical Summary</h3>
          </div>
          <p className="dd-placeholder-text">No analysis yet. Upload and analyze a scan.</p>
        </div>

        <div className="dd-panel-card">
          <div className="dd-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <h3>AI Explanation</h3>
          </div>
          <p className="dd-placeholder-text">Analysis results will appear here.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Results Tab (3D Viewer + AI Chat) ──────────────── */
function ResultsTab() {
  const { result } = useApp();
  const s = result.summary;
  const m = result.metrics;
  const riskClass = `risk-${(m?.risk_level || "low").toLowerCase()}`;

  const [viewMode, setViewMode] = useState("3d");
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: `Tumor detected in ${s?.region || "brain region"}. Volume: ${s?.volume || "N/A"}.`, initial: true },
    { role: "ai", text: `Laterality: ${s?.laterality || "N/A"}. Risk level assessed as ${s?.risk_level || "N/A"}.`, initial: true },
    { role: "ai", text: "Ask me anything about this scan report.", initial: true },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const newMessages = [...chatMessages, { role: "user", text: msg }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const systemContext = buildScanContext(result);
      const aiText = await askGemini(newMessages, systemContext);
      setChatMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "ai", text: `⚠️ ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="dd-results-layout">
      {/* ── Left panel: stats ── */}
      <div className="dd-left-panel">
        <div className="dd-panel-card">
          <div className="dd-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <h3>Surgical Summary</h3>
          </div>
          <div className="dd-stat-list">
            <div className="dd-stat-row"><span className="dd-stat-key">Region</span><span className="dd-stat-val">{s?.region || "—"}</span></div>
            <div className="dd-stat-row"><span className="dd-stat-key">Volume</span><span className="dd-stat-val">{s?.volume || "—"}</span></div>
            <div className="dd-stat-row"><span className="dd-stat-key">Dimensions</span><span className="dd-stat-val">{s?.dimensions || "—"}</span></div>
            <div className="dd-stat-row"><span className="dd-stat-key">Laterality</span><span className="dd-stat-val">{s?.laterality || "—"}</span></div>
            <div className="dd-stat-row"><span className="dd-stat-key">Depth</span><span className="dd-stat-val">{s?.depth || "—"}</span></div>
            <div className="dd-stat-row">
              <span className="dd-stat-key">Risk Level</span>
              <span className={`dd-stat-val ${riskClass}`}>{s?.risk_level || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Center: toggle + viewer ── */}
      <div className="dd-center-panel">
        <div className="dd-view-toggle">
          <button
            className={`dd-toggle-btn ${viewMode === "3d" ? "active" : ""}`}
            onClick={() => setViewMode("3d")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            3D View
          </button>
          <button
            className={`dd-toggle-btn ${viewMode === "2d" ? "active" : ""}`}
            onClick={() => setViewMode("2d")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
            2D Slices
          </button>
        </div>

        <div className="dd-viewer-full">
          {viewMode === "3d" ? (
            <Viewer tumorMeshUrl={result.mesh_url} brainMeshUrl={result.brain_mesh_url} />
          ) : (
            <div className="dd-slice-center">
              <SliceViewer sliceInfo={result.slice_info} />
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: AI Chat ── */}
      <div className="dd-right-panel">
        <div className="dd-chat-panel">
          <div className="dd-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>AI Explanation</h3>
          </div>

          <div className="dd-chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`dd-chat-msg dd-chat-${msg.role}`}>
                {msg.role === "ai" && (
                  <div className="dd-chat-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </div>
                )}
                <div className="dd-chat-bubble">{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="dd-chat-msg dd-chat-ai">
                <div className="dd-chat-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </div>
                <div className="dd-chat-bubble dd-chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="dd-chat-input-row">
            <input
              type="text"
              className="dd-chat-input"
              placeholder="Ask about this scan report..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
            />
            <button className="dd-chat-send" onClick={handleSend} disabled={!chatInput.trim() || chatLoading}>
              {chatLoading
                ? <span className="spinner" style={{ width: 14, height: 14 }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Clinical Tab ───────────────────────────────────── */
function ClinicalTab() {
  const { result } = useApp();
  const s = result.summary;
  const m = result.metrics;
  const p = result.pipeline;
  const reasoning = result.reasoning || [];
  const riskFactors = m?.risk_factors || [];

  return (
    <div className="page results-page">
      <section className="doctor-section">
        <div className="doctor-grid">
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

          <div className="detail-card">
            <h3>Planning Focus</h3>
            <p className="subtitle">High-signal cues for the surgical workflow.</p>
            <div className="focus-grid">
              <div className="focus-item"><span className="label">Laterality</span><span className="value">{s?.laterality || "n/a"}</span></div>
              <div className="focus-item"><span className="label">Risk Level</span><span className="value">{s?.risk_level || "n/a"}</span></div>
              <div className="focus-item"><span className="label">Dimensions</span><span className="value">{s?.dimensions || "n/a"}</span></div>
              <div className="focus-item"><span className="label">Depth</span><span className="value">{s?.depth || "n/a"}</span></div>
              <div className="focus-item"><span className="label">Pipeline</span><span className="value">{p?.segmentation_mode || "n/a"}</span></div>
              <div className="focus-item"><span className="label">Voxel Spacing</span><span className="value">{(p?.voxel_spacing_mm || []).join(" × ") || "n/a"} mm</span></div>
            </div>
          </div>
        </div>

        <div className="detail-card reasoning-section">
          <h3>Clinical Reasoning</h3>
          <p className="subtitle">Step-by-step justification for the reported summary.</p>
          {riskFactors.length > 0 && (
            <div className="risk-chips">
              {riskFactors.map((f) => <span key={f} className="risk-chip">{f}</span>)}
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

/* ── Doctor Dashboard Shell ─────────────────────────── */
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasResults } = useApp();
  const path = location.pathname;

  const activeTab = path === "/doctor/results" ? "results"
    : path === "/doctor/clinical" ? "clinical"
    : "upload";

  return (
    <div className="dashboard">
      <div className="dashboard-tabs">
        <button
          className={`dash-tab ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => navigate("/doctor")}
        >
          Upload
        </button>
        <button
          className={`dash-tab ${activeTab === "results" ? "active" : ""}`}
          disabled={!hasResults}
          onClick={() => navigate("/doctor/results")}
        >
          3D Viewer
        </button>
        <button
          className={`dash-tab ${activeTab === "clinical" ? "active" : ""}`}
          disabled={!hasResults}
          onClick={() => navigate("/doctor/clinical")}
        >
          Clinical
        </button>
      </div>

      {activeTab === "upload"   && <UploadTab />}
      {activeTab === "results"  && <ResultsTab />}
      {activeTab === "clinical" && <ClinicalTab />}
    </div>
  );
}
