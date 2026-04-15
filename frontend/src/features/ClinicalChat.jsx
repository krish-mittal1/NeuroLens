import { useState, useEffect } from "react";

/**
 * FEATURE 4 — AI Clinical Chat Demo
 * Simulated clinical assistant with pre-written intelligent responses
 * Multiple case scenarios with quick-prompt buttons
 */
export default function ClinicalChat() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);

  // Pre-written case scenarios
  const cases = [
    {
      id: "BraTS-Patient-042",
      type: "GBM",
      location: "Left Frontal",
      size: "4.1cm",
      age: 54,
    },
    {
      id: "BraTS-Patient-089",
      type: "Meningioma",
      location: "Right Parietal",
      size: "2.8cm",
      age: 67,
    },
    {
      id: "BraTS-Patient-127",
      type: "Astrocytoma",
      location: "Cerebellum",
      size: "3.5cm",
      age: 41,
    },
  ];

  const currentCase = cases[currentCaseIndex];

  // Pre-written intelligent responses for each prompt
  const responses = {
    location: `The tumor is located in the ${currentCase.location} region, specifically at coordinates approximately 45mm lateral, 25mm anterior, and 30mm superior to the AC-PC line. The lesion shows infiltrative margins extending into the surrounding white matter tracts. Based on T1CE imaging, the enhancing portion measures ${currentCase.size} with additional FLAIR hyperintensity suggesting peritumoral edema extending 1.2-1.5cm beyond the enhancing margin.`,
    
    functions: `Given the ${currentCase.location} location, the following functions are at risk:\n\n• Motor Control: The tumor's proximity to the precentral gyrus places primary motor cortex at risk, particularly hand and facial motor control\n• Speech Production: Broca's area (BA 44/45) is within 8mm of the tumor margin — expressive aphasia is a significant risk\n• Executive Function: Dorsolateral prefrontal involvement may impact working memory, planning, and cognitive flexibility\n• Supplementary Motor Area: Risk of transient mutism and motor planning deficits post-resection\n\nRecommendation: Awake craniotomy with intraoperative language mapping and motor monitoring is strongly advised.`,
    
    infiltration: `The infiltration score of 72% indicates a highly invasive tumor with significant extension beyond the visible enhancing margin. This metric is derived from:\n\n• DTI tractography showing disruption of white matter tracts (corpus callosum, superior longitudinal fasciculus)\n• FLAIR signal abnormality extending 15mm beyond T1CE enhancement\n• Perfusion MRI showing elevated rCBV in peritumoral region suggesting tumor infiltration vs pure edema\n• DWI restriction in non-enhancing areas indicating high cellularity\n\nClinical Implication: Gross total resection is unlikely without significant functional deficit. Consider subtotal resection with adjuvant chemoradiation. Molecular markers (IDH, MGMT) will guide prognosis and treatment intensity.`,
    
    imaging: `Recommended pre-operative imaging protocol:\n\n1. Structural MRI:\n   • 3D T1 MPRAGE pre/post gadolinium (1mm isotropic)\n   • 3D T2-FLAIR (1mm isotropic)\n   • T2-weighted axial\n\n2. Functional Imaging:\n   • fMRI: language paradigm (verb generation, picture naming)\n   • fMRI: motor mapping (hand/foot movement)\n   • DTI: 64-direction minimum for tractography\n\n3. Advanced Sequences:\n   • MR Spectroscopy: Cho/NAA ratio, lactate peak\n   • Perfusion (DSC): rCBV mapping\n   • DWI/ADC: cellularity assessment\n\n4. Surgical Planning:\n   • Neuronavigation protocol with fiducial markers\n   • Vessel imaging (MRA/MRV) if near major vessels\n\nAll sequences should be acquired within 48 hours of surgery and loaded into neuronavigation system.`,
    
    approach: `Surgical approach options for ${currentCase.location} ${currentCase.type}:\n\n1. Awake Craniotomy (RECOMMENDED):\n   • Allows real-time language and motor mapping\n   • Patient positioned supine, head neutral or slight rotation\n   • Cortical and subcortical stimulation during resection\n   • Maximize resection while preserving eloquent cortex\n\n2. Asleep Craniotomy with Neuromonitoring:\n   • If patient unable to tolerate awake procedure\n   • Motor evoked potentials (MEPs)\n   • Somatosensory evoked potentials (SSEPs)\n   • Limited by inability to test language real-time\n\n3. Stereotactic Biopsy:\n   • If tumor deemed unresectable\n   • Tissue diagnosis for molecular profiling\n   • Minimal morbidity but no cytoreductive benefit\n\nRecommended: Option 1 (awake craniotomy) given tumor size and location in eloquent cortex. Coordinate with neuroanesthesia and speech pathology for intraoperative support.`,
  };

  // Quick prompt buttons
  const prompts = [
    { id: "location", label: "Where exactly is the tumor?" },
    { id: "functions", label: "What functions are at risk?" },
    { id: "infiltration", label: "What does infiltration score 72% mean?" },
    { id: "imaging", label: "Recommend pre-op imaging" },
    { id: "approach", label: "What are the surgical approach options?" },
  ];

  // Simulate typing animation
  const typeMessage = (text) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text }]);
      setIsTyping(false);
    }, 1200);
  };

  const handlePromptClick = (promptId) => {
    const prompt = prompts.find((p) => p.id === promptId);
    setMessages((prev) => [...prev, { role: "user", text: prompt.label }]);
    typeMessage(responses[promptId]);
  };

  const loadNewCase = () => {
    const nextIndex = (currentCaseIndex + 1) % cases.length;
    setCurrentCaseIndex(nextIndex);
    setMessages([]);
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
        Feature 4
      </div>

      <h2 style={{
        fontSize: "2rem",
        fontWeight: "700",
        marginBottom: "12px",
        color: "#E5E7EB",
        letterSpacing: "-0.02em",
      }}>
        AI Clinical Chat Demo
      </h2>

      <p style={{
        fontSize: "1rem",
        color: "#9CA3AF",
        marginBottom: "40px",
        maxWidth: "700px",
        lineHeight: "1.6",
      }}>
        Interact with an AI clinical assistant trained on neurosurgical cases. Ask questions about tumor location, surgical risk, and treatment planning.
      </p>

      {/* Chat Container */}
      <div style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "12px",
        overflow: "hidden",
      }}>
        {/* Case Context Header */}
        <div style={{
          padding: "20px 24px",
          background: "#0B1220",
          borderBottom: "1px solid #1F2937",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "#2DD4BF",
          }}>
            <span style={{ color: "#6B7280" }}>Case:</span> {currentCase.id} · 
            <span style={{ color: "#6B7280" }}> Type:</span> {currentCase.type} · 
            <span style={{ color: "#6B7280" }}> Location:</span> {currentCase.location} · 
            <span style={{ color: "#6B7280" }}> Size:</span> {currentCase.size} · 
            <span style={{ color: "#6B7280" }}> Age:</span> {currentCase.age}
          </div>
          <button
            onClick={loadNewCase}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #1F2937",
              background: "transparent",
              color: "#9CA3AF",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = "#2DD4BF";
              e.target.style.color = "#2DD4BF";
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = "#1F2937";
              e.target.style.color = "#9CA3AF";
            }}
          >
            Ask Another Case
          </button>
        </div>

        {/* Chat Messages Area */}
        <div style={{
          padding: "24px",
          minHeight: "400px",
          maxHeight: "500px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>
          {messages.length === 0 && !isTyping && (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6B7280",
              fontSize: "0.9rem",
              textAlign: "center",
            }}>
              Select a question below to start the clinical consultation
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                fontSize: "0.7rem",
                fontWeight: "600",
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {msg.role === "user" ? "You" : "NeuroLens AI"}
              </div>
              <div style={{
                maxWidth: "85%",
                padding: "14px 18px",
                borderRadius: "8px",
                background: msg.role === "user" ? "#1F2937" : "#0B1220",
                border: msg.role === "user" ? "1px solid #374151" : "1px solid rgba(45, 212, 191, 0.2)",
                color: "#E5E7EB",
                fontSize: "0.9rem",
                lineHeight: "1.7",
                fontFamily: msg.role === "assistant" ? "monospace" : "inherit",
                whiteSpace: "pre-line",
              }}>
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              alignItems: "flex-start",
            }}>
              <div style={{
                fontSize: "0.7rem",
                fontWeight: "600",
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                NeuroLens AI
              </div>
              <div style={{
                padding: "14px 18px",
                borderRadius: "8px",
                background: "#0B1220",
                border: "1px solid rgba(45, 212, 191, 0.2)",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}>
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#2DD4BF",
                  animation: "blink 1.4s infinite",
                  animationDelay: "0s",
                }} />
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#2DD4BF",
                  animation: "blink 1.4s infinite",
                  animationDelay: "0.2s",
                }} />
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#2DD4BF",
                  animation: "blink 1.4s infinite",
                  animationDelay: "0.4s",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompt Buttons */}
        <div style={{
          padding: "20px 24px",
          background: "#0B1220",
          borderTop: "1px solid #1F2937",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}>
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handlePromptClick(prompt.id)}
              disabled={isTyping}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #1F2937",
                background: "#111827",
                color: "#E5E7EB",
                fontSize: "0.85rem",
                fontWeight: "500",
                cursor: isTyping ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isTyping ? 0.5 : 1,
              }}
              onMouseOver={(e) => {
                if (!isTyping) {
                  e.target.style.borderColor = "#2DD4BF";
                  e.target.style.background = "rgba(45, 212, 191, 0.1)";
                }
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = "#1F2937";
                e.target.style.background = "#111827";
              }}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CSS Animation for typing dots */}
      <style>{`
        @keyframes blink {
          0%, 20%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
