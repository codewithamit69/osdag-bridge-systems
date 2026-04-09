import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "osdag_tour_done";

const STEPS = [
  { id: 0, title: "Welcome to OsdagBridge Analysis", text: "A structural engineering tool for IS 800 / IS 456 compliant bridge beam analysis.", target: null },
  { id: 1, title: "Input panel", text: "This is your input panel. Enter span length, loads, material properties, and section data here. Hard validation runs in real time — red means blocked, amber means warning.", target: "#input-bar" },
  { id: 2, title: "Action Bar", text: "The action bar always stays fully visible below the input fields — no scrolling needed. 'Analyze' runs the full calculation. 'Reset' restores default values. Warnings about your inputs appear here too so you can fix them before running.", target: "#action-bar" },
  { id: 3, title: "System Overview", text: "This schematic updates live with your inputs — it shows UDL arrows, point load position, and support conditions visually.", target: "#system-overview" },
  { id: 4, title: "Plot selector", text: "Use this dropdown to switch between six analysis diagrams: Shear Force, Bending Moment, Deflection, Normal Stress, Shear Stress, and Load vs Deflection.", target: "#plot-selector" },
  { id: 5, title: "Graph area", text: "Hover anywhere on the graph to see exact values at that position. Peak and critical points are annotated automatically.", target: "#graph-area" },
  { id: 6, title: "Compliance badges", text: "These badges show real-time IS 800 code compliance. Green = pass, red = fail. Each badge cites the exact clause.", target: "#compliance-badges" },
  { id: 7, title: "Report button", text: "Download a full PDF report containing your inputs, all six diagrams, and a plain-English explanation of each result.", target: "#download-report-btn" },
];

function getRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(8, r.top - 6),
    left: Math.max(8, r.left - 6),
    width: r.width + 12,
    height: r.height + 12,
  };
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setOpen(true);
      setStep(0);
    }
  }, []);

  const current = STEPS[step] || STEPS[0];
  const rect = useMemo(() => getRect(current.target), [current]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      // trigger layout update by setting same step
      setStep((s) => s);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      skip();
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const replay = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep(0);
    setOpen(true);
  };

  const tooltipStyle = rect
    ? { top: Math.min(window.innerHeight - 200, rect.top + rect.height + 12), left: Math.min(window.innerWidth - 380, rect.left) }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <>
      <button
        type="button"
        onClick={replay}
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          zIndex: 70,
          height: "44px",
          width: "44px",
          borderRadius: "50%",
          border: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          cursor: "pointer",
          fontSize: "18px",
          fontWeight: 700,
        }}
        aria-label="Replay onboarding tour"
      >
        ?
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.70)" }} />
          {rect && (
            <div
              style={{
                position: "absolute",
                borderRadius: "12px",
                border: "2px solid rgba(59,130,246,0.6)",
                pointerEvents: "none",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              zIndex: 81,
              width: "360px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              padding: "16px",
              color: "var(--text-primary)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              ...tooltipStyle,
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 500 }}>{current.title}</div>
            <div style={{ marginTop: "8px", fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{current.text}</div>
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={skip}
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "transparent",
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  style={{
                    borderRadius: "8px",
                    background: "var(--accent-blue)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {step >= STEPS.length - 1 ? "Finish" : step === 0 ? "Start Tour" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
