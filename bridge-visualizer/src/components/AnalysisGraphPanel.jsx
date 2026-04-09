import React, { Suspense, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import html2canvas from "html2canvas";

const Plot = React.lazy(() => import("react-plotly.js"));

function getPeak(series = []) {
  if (!series.length) return { idx: 0, val: 0 };
  let idx = 0;
  for (let i = 1; i < series.length; i += 1) {
    if (Math.abs(series[i]) > Math.abs(series[idx])) idx = i;
  }
  return { idx, val: series[idx] };
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const OPTIONS = [
  { key: "shear_force", label: "Shear Force (kN)", unit: "kN" },
  { key: "bending_moment", label: "Bending Moment (kN·m)", unit: "kN·m" },
  { key: "deflection", label: "Deflection (mm)", unit: "mm" },
  { key: "normal_stress", label: "Normal Stress (MPa)", unit: "MPa" },
  { key: "shear_stress", label: "Shear Stress (MPa)", unit: "MPa" },
  { key: "load_vs_deflection", label: "Load vs Deflection", unit: "mm" },
];

export const AnalysisGraphPanel = forwardRef(function AnalysisGraphPanel({ result, heightClass = "", onPlotChange, graphHeight = 420 }, ref) {
  const [plotKey, setPlotKey] = useState("shear_force");
  const [themeKey, setThemeKey] = useState(0); // force re-render on theme change
  const plotSpec = result?.plots?.[plotKey]?.plotly;
  const scenarioText = result?.inputs_normalized?.scenario_label || "Unknown";
  const span = result?.inputs_normalized?.span_length_m ?? 0;
  const selectedOption = OPTIONS.find((o) => o.key === plotKey) || OPTIONS[0];

  // Listen for theme changes
  useEffect(() => {
    const handler = () => setThemeKey((k) => k + 1);
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  const themeColors = useMemo(() => ({
    paperBg: getCSSVar("--plot-paper-bg") || "#0f1117",
    plotBg: getCSSVar("--plot-paper-bg") || "#0f1117",
    fontColor: getCSSVar("--text-secondary") || "#94a3b8",
    gridColor: getCSSVar("--plot-grid-color") || "#334155",
    borderColor: getCSSVar("--border-color") || "rgba(255,255,255,0.12)",
    bgCard: getCSSVar("--bg-card") || "#1e2132",
    bgSecondary: getCSSVar("--bg-secondary") || "#1a1d2e",
    textPrimary: getCSSVar("--text-primary") || "#ffffff",
    textSecondary: getCSSVar("--text-secondary") || "rgba(255,255,255,0.65)",
    textMuted: getCSSVar("--text-muted") || "rgba(255,255,255,0.35)",
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [themeKey]);

  const mergedSpec = useMemo(() => {
    if (!plotSpec) return null;
    const baseData = Array.isArray(plotSpec.data) ? plotSpec.data : [];
    const primary = baseData[0] || { x: [], y: [] };
    const px = primary.x || [];
    const py = primary.y || [];
    const peak = getPeak(py);
    const peakX = px[peak.idx] ?? 0;
    const peakY = py[peak.idx] ?? 0;
    const peakTrace = {
      type: "scatter",
      mode: "markers+text",
      x: [peakX],
      y: [peakY],
      marker: { size: 9, color: "#f97316" },
      text: [`Peak ${Number(peakY).toFixed(3)}`],
      textposition: "top center",
      hovertemplate: `x: %{x:.3f} m<br>val: %{y:.3f} ${selectedOption?.unit || ""}<extra></extra>`,
      showlegend: false,
    };

    return {
      data: [...baseData, peakTrace],
      layout: {
        ...(plotSpec.layout || {}),
        paper_bgcolor: themeColors.paperBg,
        plot_bgcolor: themeColors.plotBg,
        font: { color: themeColors.fontColor },
        xaxis: {
          ...(plotSpec.layout?.xaxis || {}),
          gridcolor: themeColors.gridColor,
          zerolinecolor: themeColors.gridColor,
        },
        yaxis: {
          ...(plotSpec.layout?.yaxis || {}),
          gridcolor: themeColors.gridColor,
          zerolinecolor: themeColors.gridColor,
        },
        margin: { l: 55, r: 20, t: 40, b: 40 },
        height: graphHeight,
        autosize: true,
      },
      stats: {
        maxValue: Math.abs(Number(peakY || 0)).toFixed(3),
        scenario: scenarioText,
        unit: selectedOption.unit,
      },
    };
  }, [graphHeight, plotSpec, scenarioText, selectedOption, themeColors]);

  const capturePlotForPDF = useCallback(async (targetKey) => {
    setPlotKey(targetKey);
    if (typeof onPlotChange === "function") onPlotChange(targetKey);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const container = document.getElementById("graph-area");
    if (!container) return null;
    // Add pdf-capture-mode for white background
    container.classList.add("pdf-capture-mode");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 2 });
    container.classList.remove("pdf-capture-mode");
    return canvas;
  }, [onPlotChange]);

  useImperativeHandle(
    ref,
    () => ({
      async capturePlot(targetKey) {
        return capturePlotForPDF(targetKey);
      },
      setPlot(targetKey) {
        setPlotKey(targetKey);
        if (typeof onPlotChange === "function") onPlotChange(targetKey);
      },
      getCurrentPlotKey() {
        return plotKey;
      },
    }),
    [onPlotChange, plotKey, capturePlotForPDF]
  );

  if (!mergedSpec) return null;

  return (
    <div
      style={{
        borderRadius: "16px",
        border: `1px solid ${themeColors.borderColor}`,
        background: themeColors.bgCard,
        padding: "12px",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 8px 30px rgba(0,0,0,0.35)",
      }}
      className={heightClass}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            id="plot-selector"
            value={plotKey}
            onChange={(e) => {
              setPlotKey(e.target.value);
              if (typeof onPlotChange === "function") onPlotChange(e.target.value);
            }}
            aria-label="Select analysis chart"
            style={{
              borderRadius: "12px",
              border: `1px solid ${themeColors.borderColor}`,
              background: themeColors.bgSecondary,
              padding: "8px 12px",
              fontSize: "14px",
              color: themeColors.textPrimary,
              outline: "none",
            }}
          >
            {OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <div
            style={{
              borderRadius: "12px",
              border: `1px solid ${themeColors.borderColor}`,
              background: themeColors.bgSecondary,
              padding: "8px 12px",
              fontSize: "14px",
              color: themeColors.textSecondary,
            }}
          >
            {scenarioText}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <div style={{ borderRadius: "8px", border: `1px solid ${themeColors.borderColor}`, background: themeColors.bgSecondary, padding: "4px 8px", fontSize: "12px", textTransform: "uppercase", color: themeColors.textMuted }}>
            MAX VALUE: <span style={{ color: themeColors.textPrimary, fontSize: "14px", fontWeight: 500 }}>{mergedSpec.stats.maxValue} {mergedSpec.stats.unit}</span>
          </div>
          <div style={{ borderRadius: "8px", border: `1px solid ${themeColors.borderColor}`, background: themeColors.bgSecondary, padding: "4px 8px", fontSize: "12px", textTransform: "uppercase", color: themeColors.textMuted }}>
            SPAN: <span style={{ color: themeColors.textPrimary, fontSize: "14px", fontWeight: 500 }}>{Number(span).toFixed(3)} m</span>
          </div>
          <div style={{ borderRadius: "8px", border: `1px solid ${themeColors.borderColor}`, background: themeColors.bgSecondary, padding: "4px 8px", fontSize: "12px", textTransform: "uppercase", color: themeColors.textMuted }}>
            SCENARIO: <span style={{ color: themeColors.textPrimary, fontSize: "14px", fontWeight: 500 }}>{mergedSpec.stats.scenario}</span>
          </div>
        </div>
      </div>

      <div id="graph-area" className="overflow-hidden" style={{ height: `${graphHeight}px` }}>
        <Suspense fallback={<div style={{ height: "100%", borderRadius: "12px", background: "var(--bg-input)" }} className="animate-pulse" />}>
          <Plot
            data={mergedSpec.data}
            layout={mergedSpec.layout}
            useResizeHandler={true}
            style={{ width: "100%", height: "100%" }}
            config={{ responsive: true, displaylogo: false }}
          />
        </Suspense>
      </div>
    </div>
  );
});
