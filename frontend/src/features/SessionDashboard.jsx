import { useState, useEffect, useRef } from "react";
import { useSession } from "./SessionContext";

/**
 * FEATURE 5 — Surgical Decision Confidence Tracker
 * Live dashboard showing session metrics and activity log
 * Counts up metrics on scroll into view and tracks all feature interactions
 */
export default function SessionDashboard() {
  const { sessionLogs } = useSession();
  const [hasAnimated, setHasAnimated] = useState(false);
  const [counts, setCounts] = useState({
    casesReviewed: 0,
    flaggedSlices: 0,
    riskAssessments: 0,
    regionsExplored: 0,
  });
  const sectionRef = useRef(null);

  // Calculate actual metrics from session logs
  const actualMetrics = {
    casesReviewed: sessionLogs.filter((log) => log.type === "case_reviewed").length,
    flaggedSlices: sessionLogs.filter((log) => log.type === "slice_flagged").length,
    riskAssessments: sessionLogs.filter((log) => log.type === "risk_estimated").length,
    regionsExplored: sessionLogs.filter((log) => log.type === "region_explored").length,
  };

  // Intersection Observer to trigger count-up animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCounts();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [hasAnimated]);

  // Count-up animation
  const animateCounts = () => {
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setCounts({
        casesReviewed: Math.floor(actualMetrics.casesReviewed * progress),
        flaggedSlices: Math.floor(actualMetrics.flaggedSlices * progress),
        riskAssessments: Math.floor(actualMetrics.riskAssessments * progress),
        regionsExplored: Math.floor(actualMetrics.regionsExplored * progress),
      });

      if (step >= steps) {
        clearInterval(timer);
        setCounts(actualMetrics);
      }
    }, interval);
  };

  // Re-animate when actual metrics change
  useEffect(() => {
    if (hasAnimated) {
      setCounts(actualMetrics);
    }
  }, [sessionLogs]);

  return (
    <section ref={sectionRef} style={{ padding: "80px 40px", maxWidth: "1200px", margin: "0 auto" }}>
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
        Feature 5
      </div>

      <h2 style={{
        fontSize: "2rem",
        fontWeight: "700",
        marginBottom: "12px",
        color: "#E5E7EB",
        letterSpacing: "-0.02em",
      }}>
        Surgical Decision Confidence Tracker
      </h2>

      <p style={{
        fontSize: "1rem",
        color: "#9CA3AF",
        marginBottom: "40px",
        maxWidth: "700px",
        lineHeight: "1.6",
      }}>
        Real-time tracking of your clinical decision-making session. Every interaction is logged to build a comprehensive surgical planning record.
      </p>

      {/* Metrics Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
      }}>
        {/* Cases Reviewed */}
        <div style={{
          background: "#111827",
          border: "1px solid #1F2937",
          borderRadius: "12px",
          padding: "24px",
          transition: "border-color 0.2s ease",
        }}>
          <div style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "12px",
          }}>
            Cases Reviewed This Session
          </div>
          <div style={{
            fontSize: "3rem",
            fontWeight: "700",
            color: "#2DD4BF",
            fontVariantNumeric: "tabular-nums",
          }}>
            {counts.casesReviewed}
          </div>
        </div>

        {/* Flagged Slices */}
        <div style={{
          background: "#111827",
          border: "1px solid #1F2937",
          borderRadius: "12px",
          padding: "24px",
          transition: "border-color 0.2s ease",
        }}>
          <div style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "12px",
          }}>
            Flagged Slices
          </div>
          <div style={{
            fontSize: "3rem",
            fontWeight: "700",
            color: "#2DD4BF",
            fontVariantNumeric: "tabular-nums",
          }}>
            {counts.flaggedSlices}
          </div>
        </div>

        {/* Risk Assessments */}
        <div style={{
          background: "#111827",
          border: "1px solid #1F2937",
          borderRadius: "12px",
          padding: "24px",
          transition: "border-color 0.2s ease",
        }}>
          <div style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "12px",
          }}>
            Risk Assessments Run
          </div>
          <div style={{
            fontSize: "3rem",
            fontWeight: "700",
            color: "#2DD4BF",
            fontVariantNumeric: "tabular-nums",
          }}>
            {counts.riskAssessments}
          </div>
        </div>

        {/* Regions Explored */}
        <div style={{
          background: "#111827",
          border: "1px solid #1F2937",
          borderRadius: "12px",
          padding: "24px",
          transition: "border-color 0.2s ease",
        }}>
          <div style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "12px",
          }}>
            Regions Explored
          </div>
          <div style={{
            fontSize: "3rem",
            fontWeight: "700",
            color: "#2DD4BF",
            fontVariantNumeric: "tabular-nums",
          }}>
            {counts.regionsExplored}
          </div>
        </div>
      </div>

      {/* Session Summary Panel */}
      <div style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "12px",
        padding: "28px",
      }}>
        <h3 style={{
          fontSize: "1.2rem",
          fontWeight: "700",
          color: "#E5E7EB",
          marginBottom: "20px",
        }}>
          Session Summary
        </h3>

        {sessionLogs.length === 0 ? (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "#6B7280",
            fontSize: "0.9rem",
          }}>
            No activities logged yet. Interact with the features above to build your session summary.
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxHeight: "400px",
            overflowY: "auto",
          }}>
            {sessionLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px 16px",
                  background: "#0B1220",
                  borderRadius: "8px",
                  border: "1px solid #1F2937",
                }}
              >
                <span style={{
                  fontSize: "1rem",
                  color: "#22C55E",
                  flexShrink: 0,
                }}>
                  ✓
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "0.9rem",
                    color: "#E5E7EB",
                    lineHeight: "1.5",
                  }}>
                    {log.description}
                  </div>
                  <div style={{
                    fontSize: "0.75rem",
                    color: "#6B7280",
                    marginTop: "4px",
                  }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
