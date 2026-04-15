import { useState } from "react";
import { useSession } from "./SessionContext";

/**
 * FEATURE 2 — MRI Slice Interpreter
 * Simulated MRI viewer with 9 slice grid, sequence selector, and slice-by-slice findings
 * Allows flagging slices for review
 */
export default function MRIViewer() {
  const session = useSession();
  const addLog = session?.addLog || (() => {});
  const [currentSlice, setCurrentSlice] = useState(78);
  const [sequence, setSequence] = useState("T1");
  const [flaggedSlices, setFlaggedSlices] = useState([]);

  // Pre-written findings that rotate based on slice number
  const findings = [
    "No significant finding",
    "Hyperintense region detected",
    "Possible enhancement — review T1CE",
    "Tumor margin visible",
    "Edema present in surrounding tissue",
    "Contrast uptake noted",
    "Mass effect observed",
    "Midline shift detected",
  ];

  const getCurrentFinding = () => {
    const index = Math.floor(currentSlice / 20) % findings.length;
    return findings[index];
  };

  const toggleFlag = () => {
    if (flaggedSlices.includes(currentSlice)) {
      setFlaggedSlices(flaggedSlices.filter((s) => s !== currentSlice));
    } else {
      setFlaggedSlices([...flaggedSlices, currentSlice].sort((a, b) => a - b));
      // Log to session
      addLog({
        type: "slice_flagged",
        description: `Slice ${currentSlice} flagged — ${getCurrentFinding()}`,
      });
    }
  };

  // Sequence color filters (CSS filter adjustments)
  const sequenceFilters = {
    T1: "brightness(0.9) contrast(1.1)",
    T2: "brightness(1.1) contrast(0.95)",
    FLAIR: "brightness(1.05) sepia(0.1)",
    T1CE: "brightness(1) contrast(1.15) saturate(1.1)",
    DWI: "brightness(0.85) contrast(1.2)",
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
        Feature 2
      </div>

      <h2 style={{
        fontSize: "2rem",
        fontWeight: "700",
        marginBottom: "12px",
        color: "#E5E7EB",
        letterSpacing: "-0.02em",
      }}>
        MRI Slice Interpreter
      </h2>

      <p style={{
        fontSize: "1rem",
        color: "#9CA3AF",
        marginBottom: "40px",
        maxWidth: "700px",
        lineHeight: "1.6",
      }}>
        Navigate through MRI slices with real-time findings. Switch between imaging sequences and flag critical slices for detailed review.
      </p>

      {/* Main Viewer Container */}
      <div style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "12px",
        padding: "24px",
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "24px",
      }}>
        {/* Left Panel - Slice Grid & Controls */}
        <div>
          {/* Sequence Selector Tabs */}
          <div style={{
            display: "flex",
            gap: "4px",
            marginBottom: "20px",
            padding: "4px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}>
            {["T1", "T2", "FLAIR", "T1CE", "DWI"].map((seq) => (
              <button
                key={seq}
                onClick={() => setSequence(seq)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: sequence === seq ? "rgba(45, 212, 191, 0.15)" : "transparent",
                  color: sequence === seq ? "#2DD4BF" : "#9CA3AF",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {seq}
              </button>
            ))}
          </div>

          {/* 9-Slice Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "24px",
          }}>
            {Array.from({ length: 9 }, (_, i) => {
              const sliceNum = currentSlice - 4 + i;
              const isActive = sliceNum === currentSlice;
              return (
                <div
                  key={i}
                  onClick={() => setCurrentSlice(sliceNum)}
                  style={{
                    aspectRatio: "1",
                    background: "#0B1220",
                    borderRadius: "8px",
                    border: isActive ? "2px solid #2DD4BF" : "1px solid #1F2937",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    filter: sequenceFilters[sequence],
                    boxShadow: isActive ? "0 0 20px rgba(45, 212, 191, 0.3)" : "none",
                  }}
                >
                  {/* Simulated scan texture using CSS */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: `
                      radial-gradient(circle at 50% 50%, rgba(100, 100, 100, 0.3) 0%, transparent 70%),
                      repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 2px, transparent 4px),
                      repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, transparent 2px, transparent 4px)
                    `,
                    opacity: 0.6,
                  }} />
                  
                  {/* Slice number overlay */}
                  <div style={{
                    position: "absolute",
                    bottom: "6px",
                    right: "6px",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    color: isActive ? "#2DD4BF" : "#6B7280",
                    background: "rgba(0, 0, 0, 0.5)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}>
                    {sliceNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slice Slider */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}>
              <span style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#9CA3AF",
              }}>
                Slice: {currentSlice} / 155
              </span>
              <button
                onClick={toggleFlag}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: flaggedSlices.includes(currentSlice) ? "1px solid #2DD4BF" : "1px solid #1F2937",
                  background: flaggedSlices.includes(currentSlice) ? "rgba(45, 212, 191, 0.1)" : "transparent",
                  color: flaggedSlices.includes(currentSlice) ? "#2DD4BF" : "#9CA3AF",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {flaggedSlices.includes(currentSlice) ? "✓ Flagged" : "Flag This Slice"}
              </button>
            </div>
            <input
              type="range"
              min="1"
              max="155"
              value={currentSlice}
              onChange={(e) => setCurrentSlice(parseInt(e.target.value))}
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "3px",
                background: "#1F2937",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
        </div>

        {/* Right Panel - Findings & Flagged List */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}>
          {/* Current Slice Info */}
          <div style={{
            background: "#0B1220",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #1F2937",
          }}>
            <div style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
            }}>
              Current Slice
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <div style={{
                fontSize: "0.8rem",
                color: "#6B7280",
                marginBottom: "4px",
              }}>
                Slice Position
              </div>
              <div style={{
                fontSize: "1rem",
                fontWeight: "600",
                color: "#E5E7EB",
              }}>
                Axial · Z = {(currentSlice * 1.5).toFixed(1)}mm
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{
                fontSize: "0.8rem",
                color: "#6B7280",
                marginBottom: "4px",
              }}>
                Sequence
              </div>
              <div style={{
                fontSize: "1rem",
                fontWeight: "600",
                color: "#2DD4BF",
              }}>
                {sequence}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: "0.8rem",
                color: "#6B7280",
                marginBottom: "6px",
              }}>
                Finding
              </div>
              <div style={{
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "#E5E7EB",
                lineHeight: "1.5",
                padding: "12px",
                background: "rgba(45, 212, 191, 0.05)",
                borderRadius: "6px",
                border: "1px solid rgba(45, 212, 191, 0.1)",
              }}>
                {getCurrentFinding()}
              </div>
            </div>
          </div>

          {/* Flagged Slices List */}
          <div style={{
            background: "#0B1220",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #1F2937",
            flex: 1,
          }}>
            <div style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
            }}>
              Flagged for Review ({flaggedSlices.length})
            </div>

            {flaggedSlices.length === 0 ? (
              <div style={{
                fontSize: "0.85rem",
                color: "#6B7280",
                textAlign: "center",
                padding: "20px 0",
              }}>
                No slices flagged yet
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "300px",
                overflowY: "auto",
              }}>
                {flaggedSlices.map((slice) => (
                  <div
                    key={slice}
                    onClick={() => setCurrentSlice(slice)}
                    style={{
                      padding: "10px 12px",
                      background: slice === currentSlice ? "rgba(45, 212, 191, 0.1)" : "#1F2937",
                      borderRadius: "6px",
                      border: slice === currentSlice ? "1px solid #2DD4BF" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "#E5E7EB",
                    }}>
                      Slice {slice}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlaggedSlices(flaggedSlices.filter((s) => s !== slice));
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#6B7280",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        padding: "0 4px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
