import { createContext, useContext, useEffect, useState } from "react";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export const PATIENT_COPY = {
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

const AppContext = createContext(null);

export function AppProvider({ children }) {
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
      return true;
    } catch (error) {
      console.error(error);
      setStatus({ text: error.message, kind: "error" });
      return false;
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
      return false;
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
      return true;
    } catch (error) {
      console.error(error);
      setStatus({ text: error.message, kind: "error" });
      return false;
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadBratsCases();
    loadModelStatus();
  }, []);

  return (
    <AppContext.Provider value={{
      selectedFile, setSelectedFile,
      bratsCases, selectedCaseId, setSelectedCaseId,
      selectedModality, setSelectedModality,
      selectedSource, setSelectedSource,
      running, loadingCases, modelStatus, status,
      result, hasResults,
      runAnalysis, runBratsCase, loadBratsCases,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
