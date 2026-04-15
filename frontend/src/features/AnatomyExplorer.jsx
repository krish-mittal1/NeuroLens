import { useState } from "react";
import { useSession } from "./SessionContext";

/**
 * FEATURE 3 — Tumor Location vs Function Map
 * Interactive SVG brain diagram with clickable regions
 * Shows function, tumor impact, surgical risk, and clinical considerations for each region
 */
export default function AnatomyExplorer() {
  const session = useSession();
  const addLog = session?.addLog || (() => {});
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // Clinical data for each brain region
  const regionData = {
    frontal: {
      name: "Frontal Lobe",
      function: "Executive function, motor control, speech production (Broca's area), personality, decision-making",
      impact: "Motor weakness, speech difficulties (expressive aphasia), personality changes, impaired judgment, loss of spontaneity",
      risk: "Moderate",
      riskColor: "#FBBF24",
      consideration: "Proximity to Broca's area — awake craniotomy may be indicated for language mapping during resection",
      tumors: ["Glioblastoma", "Meningioma", "Oligodendroglioma", "Astrocytoma"],
    },
    parietal: {
      name: "Parietal Lobe",
      function: "Sensory processing, spatial awareness, visual-spatial integration, mathematical reasoning",
      impact: "Sensory deficits, spatial disorientation, neglect syndrome, difficulty with reading and writing (alexia, agraphia)",
      risk: "Moderate",
      riskColor: "#FBBF24",
      consideration: "Consider somatosensory evoked potential monitoring. Right-sided lesions may cause contralateral neglect",
      tumors: ["Meningioma", "Glioblastoma", "Metastases"],
    },
    temporal: {
      name: "Temporal Lobe",
      function: "Memory formation, auditory processing, language comprehension (Wernicke's area), emotion regulation",
      impact: "Memory deficits, auditory processing issues, receptive aphasia, visual field defects (Meyer's loop involvement)",
      risk: "Moderate",
      riskColor: "#FBBF24",
      consideration: "Evaluate proximity to Meyer's loop and optic radiation. Consider visual field testing pre and post-op",
      tumors: ["Glioblastoma", "Low-grade glioma", "Meningioma"],
    },
    occipital: {
      name: "Occipital Lobe",
      function: "Visual processing, color recognition, visual perception and interpretation",
      impact: "Visual field defects (hemianopia), cortical blindness, visual agnosia, difficulty recognizing colors",
      risk: "Low",
      riskColor: "#22C55E",
      consideration: "Primary concern is preservation of visual fields. Functional outcomes generally favorable",
      tumors: ["Meningioma", "Metastases", "Glioblastoma"],
    },
    cerebellum: {
      name: "Cerebellum",
      function: "Motor coordination, balance, posture, fine motor control, motor learning",
      impact: "Ataxia, loss of coordination, balance difficulties, tremor, dysarthria, nystagmus",
      risk: "High",
      riskColor: "#F87171",
      consideration: "High risk of postoperative ataxia. Monitor for posterior fossa syndrome in younger patients. Careful hemostasis required",
      tumors: ["Medulloblastoma", "Hemangioblastoma", "Metastases", "Pilocytic astrocytoma"],
    },
    brainstem: {
      name: "Brain Stem",
      function: "Vital functions (breathing, heart rate), consciousness, cranial nerve nuclei, motor/sensory pathways",
      impact: "Cranial nerve palsies, respiratory compromise, altered consciousness, quadriplegia, life-threatening complications",
      risk: "Critical",
      riskColor: "#DC2626",
      consideration: "Extremely high surgical risk — biopsy only in most cases. Multidisciplinary tumor board review mandatory. Consider radiation/chemotherapy first-line",
      tumors: ["Diffuse intrinsic pontine glioma (DIPG)", "Brainstem glioma", "Cavernoma"],
    },
  };

  const activeRegion = hoveredRegion || selectedRegion;

  const handleRegionClick = (region) => {
    setSelectedRegion(region);
    // Log to session
    addLog({
      type: "region_explored",
      description: `${regionData[region].name} explored — Surgical risk: ${regionData[region].risk}`,
    });
  };

  return (
    <section style={{ padding: "80px 40px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Section Label */}
      <div style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "6px",
        fontSize: "0.7rem",
        fontWeight: "700",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#2DD4BF",
        background: "rgba(45, 212, 191, 0.08)",
        border: "1px solid rgba(45, 212, 191, 0.12)",
        marginBottom: "16px",
      }}>
        Feature 3
      </div>

      <h2 style={{
        fontSize: "2rem",
        fontWeight: "700",
        marginBottom: "12px",
        color: "#E5E7EB",
        letterSpacing: "-0.02em",
      }}>
        Tumor Location vs Function Map
      </h2>

      <p style={{
        fontSize: "1rem",
        color: "#9CA3AF",
        marginBottom: "40px",
        maxWidth: "700px",
        lineHeight: "1.6",
      }}>
        Explore brain anatomy interactively. Click any region to see its function, tumor impact, surgical risk level, and clinical considerations.
      </p>

      {/* Main Container */}
      <div style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "12px",
        padding: "32px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
        alignItems: "center",
      }}>
        {/* Left - SVG Brain Diagram */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <svg
            viewBox="0 0 400 300"
            style={{
              width: "100%",
              maxWidth: "500px",
              height: "auto",
            }}
          >
            {/* Frontal Lobe */}
            <path
              d="M 80 120 Q 60 80, 80 50 Q 120 30, 160 40 Q 180 50, 180 80 L 160 120 Z"
              fill={activeRegion === "frontal" ? "#2DD4BF" : "transparent"}
              stroke="#2DD4BF"
              strokeWidth="2"
              opacity={activeRegion === "frontal" ? 0.8 : hoveredRegion === "frontal" ? 0.4 : 0.3}
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => handleRegionClick("frontal")}
              onMouseEnter={() => setHoveredRegion("frontal")}
              onMouseLeave={() => setHoveredRegion(null)}
            />

            {/* Parietal Lobe */}
            <path
              d="M 160 120 L 180 80 Q 200 60, 240 60 Q 270 70, 280 100 L 260 140 L 200 140 Z"
              fill={activeRegion === "parietal" ? "#2DD4BF" : "transparent"}
              stroke="#2DD4BF"
              strokeWidth="2"
              opacity={activeRegion === "parietal" ? 0.8 : hoveredRegion === "parietal" ? 0.4 : 0.3}
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => handleRegionClick("parietal")}
              onMouseEnter={() => setHoveredRegion("parietal")}
              onMouseLeave={() => setHoveredRegion(null)}
            />

            {/* Temporal Lobe */}
            <path
              d="M 80 120 L 160 120 L 200 140 L 200 180 Q 180 200, 140 200 Q 100 190, 80 170 Z"
              fill={activeRegion === "temporal" ? "#2DD4BF" : "transparent"}
              stroke="#2DD4BF"
              strokeWidth="2"
              opacity={activeRegion === "temporal" ? 0.8 : hoveredRegion === "temporal" ? 0.4 : 0.3}
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => handleRegionClick("temporal")}
              onMouseEnter={() => setHoveredRegion("temporal")}
              onMouseLeave={() => setHoveredRegion(null)}
            />

            {/* Occipital Lobe */}
            <path
              d="M 200 140 L 260 140 L 280 100 Q 300 110, 310 140 Q 310 170, 290 190 L 240 190 L 200 180 Z"
              fill={activeRegion === "occipital" ? "#2DD4BF" : "transparent"}
              stroke="#2DD4BF"
              strokeWidth="2"
              opacity={activeRegion === "occipital" ? 0.8 : hoveredRegion === "occipital" ? 0.4 : 0.3}
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => handleRegionClick("occipital")}
              onMouseEnter={() => setHoveredRegion("occipital")}
              onMouseLeave={() => setHoveredRegion(null)}
            />

            {/* Cerebellum */}
            <path
              d="M 200 200 L 240 200 L 290 200 Q 300 210, 290 230 Q 270 250, 240 250 Q 210 250, 200 240 Z"
              fill={activeRegion === "cerebellum" ? "#2DD4BF" : "transparent"}
              stroke="#2DD4BF"
              strokeWidth="2"
              opacity={activeRegion === "cerebellum" ? 0.8 : hoveredRegion === "cerebellum" ? 0.4 : 0.3}
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => handleRegionClick("cerebellum")}
              onMouseEnter={() => setHoveredRegion("cerebellum")}
              onMouseLeave={() => setHoveredRegion(null)}
            />

            {/* Brain Stem */}
            <path
              d="M 200 200 L 200 240 Q 200 260, 210 270 L 220 270 Q 230 260, 230 240 L 230 200 Z"
              fill={activeRegion === "brainstem" ? "#2DD4BF" : "transparent"}
              stroke="#2DD4BF"
              strokeWidth="2"
              opacity={activeRegion === "brainstem" ? 0.8 : hoveredRegion === "brainstem" ? 0.4 : 0.3}
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onClick={() => handleRegionClick("brainstem")}
              onMouseEnter={() => setHoveredRegion("brainstem")}
              onMouseLeave={() => setHoveredRegion(null)}
            />

            {/* Region Labels */}
            <text x="120" y="80" fill="#9CA3AF" fontSize="11" fontWeight="600" textAnchor="middle">Frontal</text>
            <text x="230" y="100" fill="#9CA3AF" fontSize="11" fontWeight="600" textAnchor="middle">Parietal</text>
            <text x="130" y="160" fill="#9CA3AF" fontSize="11" fontWeight="600" textAnchor="middle">Temporal</text>
            <text x="260" y="170" fill="#9CA3AF" fontSize="11" fontWeight="600" textAnchor="middle">Occipital</text>
            <text x="245" y="230" fill="#9CA3AF" fontSize="11" fontWeight="600" textAnchor="middle">Cerebellum</text>
            <text x="215" y="250" fill="#9CA3AF" fontSize="11" fontWeight="600" textAnchor="middle">Stem</text>
          </svg>
        </div>

        {/* Right - Region Details Panel */}
        <div style={{
          background: "#0B1220",
          borderRadius: "8px",
          padding: "28px",
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}>
          {selectedRegion ? (
            <>
              {/* Region Name */}
              <div>
                <h3 style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#2DD4BF",
                  marginBottom: "8px",
                }}>
                  {regionData[selectedRegion].name}
                </h3>
                <div style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: regionData[selectedRegion].riskColor,
                  background: `${regionData[selectedRegion].riskColor}15`,
                  border: `1px solid ${regionData[selectedRegion].riskColor}30`,
                }}>
                  Surgical Risk: {regionData[selectedRegion].risk}
                </div>
              </div>

              {/* Function */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Function
                </div>
                <p style={{
                  fontSize: "0.9rem",
                  color: "#E5E7EB",
                  lineHeight: "1.6",
                }}>
                  {regionData[selectedRegion].function}
                </p>
              </div>

              {/* Tumor Impact */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Tumor Impact
                </div>
                <p style={{
                  fontSize: "0.9rem",
                  color: "#E5E7EB",
                  lineHeight: "1.6",
                }}>
                  {regionData[selectedRegion].impact}
                </p>
              </div>

              {/* Key Surgical Consideration */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Key Surgical Consideration
                </div>
                <p style={{
                  fontSize: "0.9rem",
                  color: "#2DD4BF",
                  lineHeight: "1.6",
                  padding: "12px",
                  background: "rgba(45, 212, 191, 0.05)",
                  borderRadius: "6px",
                  border: "1px solid rgba(45, 212, 191, 0.1)",
                }}>
                  {regionData[selectedRegion].consideration}
                </p>
              </div>

              {/* Common Tumor Types */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "10px",
                }}>
                  Common Tumor Types
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}>
                  {regionData[selectedRegion].tumors.map((tumor, idx) => (
                    <span key={idx} style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "#1F2937",
                      color: "#E5E7EB",
                      fontSize: "0.8rem",
                      fontWeight: "500",
                    }}>
                      {tumor}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#6B7280",
              fontSize: "0.95rem",
              lineHeight: "1.6",
            }}>
              Click on any brain region to view detailed information about its function, tumor impact, and surgical considerations
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
