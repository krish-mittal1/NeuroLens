import { useState } from "react";
import { useSession } from "./SessionContext";

/**
 * FEATURE 1 — Pre-Surgery Risk Estimator
 * Interactive tool for surgeons to estimate surgical risk based on tumor characteristics
 * Provides risk score, surgical considerations, OR time, and recommended imaging sequences
 */
export default function RiskEstimator() {
  const session = useSession();
  const addLog = session?.addLog || (() => {});
  const [region, setRegion] = useState("Left Frontal");
  const [size, setSize] = useState(3.5);
  const [age, setAge] = useState(50);
  const [tumorType, setTumorType] = useState("Glioblastoma");
  const [result, setResult] = useState(null);

  // Deterministic risk calculation logic
  const calculateRisk = () => {
    let riskScore = 0;

    // Region risk factors
    const regionRisk = {
      "Left Frontal": 2,
      "Right Temporal": 2,
      "Cerebellum": 3,
      "Brain Stem": 5,
      "Parietal": 2,
    };
    riskScore += regionRisk[region] || 2;

    // Size risk (1-6cm)
    if (size >= 5) riskScore += 3;
    else if (size >= 3.5) riskScore += 2;
    else riskScore += 1;

    // Age risk
    if (age >= 70) riskScore += 2;
    else if (age >= 60) riskScore += 1;

    // Tumor type risk
    const typeRisk = {
      "Glioblastoma": 3,
      "Meningioma": 1,
      "Astrocytoma": 2,
    };
    riskScore += typeRisk[tumorType] || 2;

    // Determine risk level
    let riskLevel, riskColor;
    if (riskScore <= 4) {
      riskLevel = "Low";
      riskColor = "#22C55E";
    } else if (riskScore <= 7) {
      riskLevel = "Moderate";
      riskColor = "#FBBF24";
    } else if (riskScore <= 10) {
      riskLevel = "High";
      riskColor = "#F87171";
    } else {
      riskLevel = "Critical";
      riskColor = "#DC2626";
    }

    // Generate surgical considerations based on region
    const considerations = {
      "Left Frontal": [
        "Proximity to Broca's area — awake craniotomy may be indicated",
        "Monitor for speech and motor function during resection",
        "Consider preoperative functional MRI mapping",
      ],
      "Right Temporal": [
        "Risk of memory and auditory processing deficits",
        "Evaluate proximity to Meyer's loop and optic radiation",
        "Consider visual field testing pre and post-op",
      ],
      "Cerebellum": [
        "High risk of postoperative ataxia and coordination deficits",
        "Monitor for posterior fossa syndrome in younger patients",
        "Careful hemostasis required due to vascular density",
      ],
      "Brain Stem": [
        "Extremely high surgical risk — consider biopsy only",
        "Risk of cranial nerve deficits and respiratory compromise",
        "Multidisciplinary tumor board review mandatory",
      ],
      "Parietal": [
        "Risk of sensory and spatial processing deficits",
        "Monitor for neglect syndrome if right-sided",
        "Consider somatosensory evoked potential monitoring",
      ],
    };

    // Estimate OR time based on complexity
    let orTimeMin = 180;
    let orTimeMax = 240;
    if (riskScore >= 10) {
      orTimeMin = 300;
      orTimeMax = 420;
    } else if (riskScore >= 7) {
      orTimeMin = 240;
      orTimeMax = 360;
    }

    // Recommended imaging sequences
    const imagingSequences = ["T1CE (contrast-enhanced)", "T2-FLAIR", "DWI (diffusion-weighted)", "DTI (tractography)"];
    if (region === "Brain Stem" || riskScore >= 10) {
      imagingSequences.push("MR Spectroscopy", "Perfusion MRI");
    }

    setResult({
      riskLevel,
      riskColor,
      considerations: considerations[region],
      orTime: `${orTimeMin}-${orTimeMax} minutes`,
      imaging: imagingSequences,
    });

    // Log to session
    addLog({
      type: "risk_estimated",
      description: `Risk estimated — ${region} · ${tumorType} · ${size}cm → ${riskLevel.toUpperCase()}`,
    });
  };

  return (
    <section style={{ padding: "80px 40px", maxWidth: "1200px", margin: "0 auto" }}>
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
        Feature 1
      </div>

      <h2 style={{
        fontSize: "2rem",
        fontWeight: "700",
        marginBottom: "12px",
        color: "#E5E7EB",
        letterSpacing: "-0.02em",
      }}>
        Pre-Surgery Risk Estimator
      </h2>

      <p style={{
        fontSize: "1rem",
        color: "#9CA3AF",
        marginBottom: "40px",
        maxWidth: "700px",
        lineHeight: "1.6",
      }}>
        Input tumor characteristics to receive an instant surgical risk assessment with clinical considerations and recommended imaging protocols.
      </p>

      {/* Interactive Card */}
      <div style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "12px",
        padding: "32px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "32px",
      }}>
        {/* Left Column - Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Tumor Region */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#E5E7EB",
              marginBottom: "8px",
            }}>
              Tumor Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #1F2937",
                background: "#0B1220",
                color: "#E5E7EB",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <option>Left Frontal</option>
              <option>Right Temporal</option>
              <option>Cerebellum</option>
              <option>Brain Stem</option>
              <option>Parietal</option>
            </select>
          </div>

          {/* Tumor Size */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#E5E7EB",
              marginBottom: "8px",
            }}>
              Tumor Size: <span style={{ color: "#2DD4BF" }}>{size.toFixed(1)}cm</span>
            </label>
            <input
              type="range"
              min="1"
              max="6"
              step="0.1"
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "3px",
                background: "#1F2937",
                outline: "none",
                cursor: "pointer",
              }}
            />
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#6B7280",
              marginTop: "4px",
            }}>
              <span>1cm</span>
              <span>6cm</span>
            </div>
          </div>

          {/* Patient Age */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#E5E7EB",
              marginBottom: "8px",
            }}>
              Patient Age: <span style={{ color: "#2DD4BF" }}>{age} years</span>
            </label>
            <input
              type="range"
              min="20"
              max="80"
              step="1"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "3px",
                background: "#1F2937",
                outline: "none",
                cursor: "pointer",
              }}
            />
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#6B7280",
              marginTop: "4px",
            }}>
              <span>20</span>
              <span>80</span>
            </div>
          </div>

          {/* Tumor Type */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#E5E7EB",
              marginBottom: "12px",
            }}>
              Tumor Type
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Glioblastoma", "Meningioma", "Astrocytoma"].map((type) => (
                <label key={type} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#E5E7EB",
                }}>
                  <input
                    type="radio"
                    name="tumorType"
                    value={type}
                    checked={tumorType === type}
                    onChange={(e) => setTumorType(e.target.value)}
                    style={{ cursor: "pointer" }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateRisk}
            style={{
              padding: "14px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#2DD4BF",
              color: "#0B1220",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s ease",
              marginTop: "8px",
            }}
            onMouseOver={(e) => e.target.style.background = "#22A89E"}
            onMouseOut={(e) => e.target.style.background = "#2DD4BF"}
          >
            Estimate Surgical Risk
          </button>
        </div>

        {/* Right Column - Results */}
        <div style={{
          background: "#0B1220",
          borderRadius: "8px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}>
          {result ? (
            <>
              {/* Risk Score */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Surgical Risk Level
                </div>
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: result.riskColor,
                }}>
                  {result.riskLevel}
                </div>
              </div>

              {/* Surgical Considerations */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "10px",
                }}>
                  Surgical Considerations
                </div>
                <ul style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}>
                  {result.considerations.map((item, idx) => (
                    <li key={idx} style={{
                      fontSize: "0.85rem",
                      color: "#E5E7EB",
                      lineHeight: "1.5",
                      paddingLeft: "16px",
                      position: "relative",
                    }}>
                      <span style={{
                        position: "absolute",
                        left: "0",
                        color: "#2DD4BF",
                      }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* OR Time */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}>
                  Estimated OR Time
                </div>
                <div style={{
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  color: "#E5E7EB",
                }}>
                  {result.orTime}
                </div>
              </div>

              {/* Recommended Imaging */}
              <div>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "10px",
                }}>
                  Recommended Imaging Sequences
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}>
                  {result.imaging.map((seq, idx) => (
                    <span key={idx} style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "rgba(45, 212, 191, 0.1)",
                      border: "1px solid rgba(45, 212, 191, 0.2)",
                      color: "#2DD4BF",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                    }}>
                      {seq}
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
              color: "#6B7280",
              fontSize: "0.9rem",
              textAlign: "center",
            }}>
              Configure parameters and click<br />"Estimate Surgical Risk" to see results
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
