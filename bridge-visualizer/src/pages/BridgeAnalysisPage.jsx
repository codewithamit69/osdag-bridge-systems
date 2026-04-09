import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { BridgeIllustration } from "../components/BridgeIllustration";
import { AnalysisGraphPanel, OPTIONS } from "../components/AnalysisGraphPanel";
import { TopInputToolbar } from "../components/TopInputToolbar";
import { ActionBar } from "../components/ActionBar";
import { OnboardingTour } from "../components/OnboardingTour";
import { HelpSection } from "../components/HelpSection";
import { ThemeToggle } from "../components/ThemeToggle";
import { useRecommendations } from "../hooks/useRecommendations";
import { useValidation } from "../hooks/useValidation";
import { useCrossFieldWarnings } from "../hooks/useCrossFieldWarnings";

const DEFAULT_FORM = Object.freeze({
  span_length_m: "20",
  dead_load_kN_per_m: "5",
  point_load_kN: "50",
  load_position_m: "10",
  impact_factor: "0.1",
  E_GPa: "200",
  I_m4: "0.0002",
  section_y_m: "0.25",
  steel_grade: "Fe350",
  n_points: "99",
});

function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatNum(v, digits = 3) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "0.000";
}

/* ===== PDF HELPERS ===== */

function sanitizeForPDF(text) {
  if (!text) return "";
  return text
    // Greek letters
    .replace(/σ/g, "sigma")
    .replace(/τ/g, "tau")
    .replace(/δ/g, "delta")
    .replace(/Δ/g, "Delta")
    .replace(/ε/g, "epsilon")
    // Math symbols
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/±/g, "+/-")
    .replace(/√/g, "sqrt")
    .replace(/∑/g, "sum")
    // Superscripts and subscripts
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/₁/g, "1")
    .replace(/₂/g, "2")
    .replace(/ₓ/g, "x")
    // Typography
    .replace(/·/g, ".")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/…/g, "...")
    // Units with special chars
    .replace(/kN·m/g, "kN.m")
    .replace(/m⁴/g, "m4")
    .replace(/m³/g, "m3")
    .replace(/m²/g, "m2")
    .replace(/kN\/m²/g, "kN/m2")
    // HTML entities
    .replace(/&[a-zA-Z0-9#]+;/g, "")
    // Non-ASCII
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E]/g, "");
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const sanitized = sanitizeForPDF(text);
  const lines = doc.splitTextToSize(sanitized, maxWidth);
  let currentY = y;
  lines.forEach((line) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, x, currentY);
    currentY += lineHeight;
  });
  return currentY;
}

export default function BridgeAnalysisPage() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.2 });

  const [apiBaseUrl] = useState("/api");
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activePlotKey, setActivePlotKey] = useState("shear_force");
  const [explanationOpen, setExplanationOpen] = useState(true);
  const [highlightedField, setHighlightedField] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1366);
  const graphRef = useRef(null);
  const inputBarRef = useRef(null);
  const helpSectionRef = useRef(null);
  const highlightTimerRef = useRef(null);

  const hasAutoRunRef = useRef(false);
  const recommendations = useRecommendations(formData);
  const crossWarnings = useCrossFieldWarnings(formData);
  const { toasts, hardBlock, validateAndToast } = useValidation(formData);

  const endpoint = useMemo(() => {
    const base = apiBaseUrl.replace(/\/$/, "");
    return `${base}/analyze/`;
  }, [apiBaseUrl]);

  const buildPayload = () => {
    const impact = Math.min(0.5, Math.max(0, toNumberOrNull(formData.impact_factor) ?? 0));
    const eRaw = toNumberOrNull(formData.E_GPa);
    const eBounded = eRaw === null ? null : Math.min(210, Math.max(190, eRaw));
    return {
      span_length_m: toNumberOrNull(formData.span_length_m),
      dead_load_kN_per_m: toNumberOrNull(formData.dead_load_kN_per_m),
      point_load_kN: toNumberOrNull(formData.point_load_kN),
      load_position_m: toNumberOrNull(formData.load_position_m),
      impact_factor: impact,
      E_GPa: eBounded,
      I_m4: toNumberOrNull(formData.I_m4),
      section_y_m: toNumberOrNull(formData.section_y_m),
      steel_grade: formData.steel_grade,
      n_points: toNumberOrNull(formData.n_points),
    };
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      if (hardBlock) {
        setError({ message: "Fix highlighted fields before analyzing." });
        return;
      }
      const payload = buildPayload();

      const resp = await axios.post(endpoint, payload, { headers: { "Content-Type": "application/json" } });
      setWarnings(resp.data?.warnings || []);
      setResult(resp.data?.data || null);
    } catch (err) {
      const raw = err?.response?.data;
      const msg =
        raw?.message ||
        (typeof raw === "string" ? raw : null) ||
        err?.message ||
        "Request failed";
      setError({ message: msg, details: raw?.details || raw });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    await analyze();
  };

  const onReset = () => {
    setFormData({ ...DEFAULT_FORM });
    setError(null);
    setWarnings([]);
    setResult(null);
    setTimeout(() => analyze(), 0);
  };

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onFieldKeyDown = (e, key) => {
    const rec = recommendations[key];
    if (e.key === "Tab" && rec && !formData[key]) {
      setField(key, String(rec));
    }
  };

  /* ===== UI Explanation Templates (Unicode OK for screen) ===== */
  const getExplanationForKey = useMemo(() => (key) => {
    if (!result) return "";
    const r = result.results_summary || {};
    const c = result.code_checks || {};
    const inorm = result.inputs_normalized || {};
    const reactions = result.reactions || {};
    const fy = inorm.yield_strength_MPa || recommendations.fyLabel || 350;
    const templates = {
      shear_force: `The shear force diagram shows how transverse forces are distributed along the beam. The maximum positive shear of ${formatNum(reactions.R_A)} kN occurs at the left support (x=0). The shear drops linearly due to the UDL of ${formData.dead_load_kN_per_m} kN/m, then jumps sharply by ${formData.point_load_kN} kN at the point load position x=${formData.load_position_m} m. The zero-crossing at x=${formatNum(result?.plots?.shear_force?.critical_points?.zero_crossing_x_m || 0)} m indicates where bending moment reaches its peak. Maximum negative shear of -${formatNum(reactions.R_B)} kN occurs just left of the right support.`,
      bending_moment: `The bending moment diagram shows the internal moment at each cross-section. The peak moment of ${formatNum(r.M_max_kNm)} kN·m occurs at x=${formatNum(r.x_at_M_max_m)} m, which is the critical design location. A positive moment means the beam is sagging (tension at bottom fiber). With your section y=${formData.section_y_m} m and moment of inertia I=${formData.I_m4} m⁴, the maximum bending stress is sigma = M·y/I = ${formatNum(r.sigma_max_MPa)} MPa, which is ${formatNum(c.stress_ratio || 0, 2)}x the yield strength fy=${fy} MPa. This section ${c.bending_ok ? "passes" : "fails"} the IS 800 Cl.8.2 bending check.`,
      deflection: `The deflection curve shows the vertical displacement of the beam under the applied loads. Maximum deflection of ${formatNum(r.delta_max_mm)} mm occurs at x=${formatNum(r.x_at_delta_max_m)} m. The IS 800 serviceability limit for this span is L/300 = ${formatNum((Number(formData.span_length_m) * 1000) / 300)} mm. Your deflection is ${formatNum((Number(r.delta_max_mm) || 0) / (((Number(formData.span_length_m) || 0) * 1000) / 300 || 1), 2)}x the limit, so this beam ${c.deflection_ok ? "passes" : "fails"} the deflection check (IS 800 Cl.5.6.1). Deflection is controlled by the EI stiffness: with E=${formData.E_GPa} GPa and I=${formData.I_m4} m⁴, EI = ${formatNum((Number(formData.E_GPa) || 0) * (Number(formData.I_m4) || 0) * 1000)} kN·m².`,
      normal_stress: `Normal stress sigma = M·y/I shows the bending stress at the extreme fiber. The maximum value of ${formatNum(r.sigma_max_MPa)} MPa occurs at the peak moment location. The yield strength of ${formData.steel_grade} steel is fy = ${fy} MPa. Stress ratio sigma/fy = ${formatNum(c.stress_ratio || 0, 3)}. IS 800 permits a maximum of 0.9fy = ${formatNum(0.9 * fy)} MPa in bending. This section ${c.bending_ok ? "passes" : "fails"} the strength check.`,
      shear_stress: `Shear stress tau = V·Q/(I·b) shows the distribution of shear across the section. Maximum shear stress of ${formatNum(r.tau_max_MPa)} MPa occurs at support region. IS 800 Cl.8.4 sets the permissible shear stress at 0.6fy = ${formatNum(0.6 * fy)} MPa. Your shear stress is ${formatNum((Number(r.tau_max_MPa) || 0) / (0.6 * fy || 1), 3)}x the limit. This section ${c.shear_ok ? "passes" : "fails"} the shear check.`,
      load_vs_deflection: `This parametric plot shows how maximum deflection grows as the total load is scaled from 10% to 200% of the design load. At the design load (multiplier = 1.0), deflection is ${formatNum(result?.plots?.load_vs_deflection?.critical_points?.design_deflection_mm || 0)} mm. The relationship is linear because the analysis assumes elastic behavior (IS 800 linear elastic model). If the curve were to become non-linear, it would indicate onset of yielding. The slope of this line is the beam's flexibility coefficient: ${formatNum(result?.plots?.load_vs_deflection?.critical_points?.slope_mm_per_multiplier || 0)} mm per kN·m.`,
    };
    return templates[key] || "";
  }, [formData, recommendations.fyLabel, result]);

  /* ===== PDF Explanation Templates (ASCII safe) ===== */
  const getPDFExplanationForKey = useMemo(() => (key) => {
    if (!result) return "";
    const r = result.results_summary || {};
    const c = result.code_checks || {};
    const inorm = result.inputs_normalized || {};
    const reactions = result.reactions || {};
    const fy = inorm.yield_strength_MPa || recommendations.fyLabel || 350;
    const templates = {
      shear_force: `The shear force diagram shows how transverse forces are distributed along the beam. The maximum positive shear of ${formatNum(reactions.R_A)} kN occurs at the left support (x=0 m). The shear drops linearly due to the UDL of ${formData.dead_load_kN_per_m} kN/m across the span, then jumps sharply by ${formData.point_load_kN} kN at the point load position x=${formData.load_position_m} m. The zero-crossing at x=${formatNum(result?.plots?.shear_force?.critical_points?.zero_crossing_x_m || 0)} m marks where bending moment reaches its peak. Maximum negative shear of -${formatNum(reactions.R_B)} kN occurs just left of the right support.`,
      bending_moment: `The bending moment diagram shows the internal moment at each cross-section. Peak moment of ${formatNum(r.M_max_kNm)} kN.m occurs at x=${formatNum(r.x_at_M_max_m)} m -- the critical design location. A positive (sagging) moment means tension acts at the bottom fiber of the section. With section y=${formData.section_y_m} m and moment of inertia I=${formData.I_m4} m4, the maximum bending stress is: sigma = M x y / I = ${formatNum(r.sigma_max_MPa)} MPa. This is ${formatNum(c.stress_ratio || 0, 2)}x the yield strength fy=${fy} MPa for ${formData.steel_grade} steel. IS 800 Cl.8.2 result: ${c.bending_ok ? "PASS" : "FAIL"}.`,
      deflection: `The deflection curve shows vertical displacement of the beam under applied loads. Maximum deflection of ${formatNum(r.delta_max_mm)} mm occurs at x=${formatNum(r.x_at_delta_max_m)} m. IS 800 serviceability limit for this span: L/300 = ${formatNum((Number(formData.span_length_m) * 1000) / 300)} mm. Your deflection is ${formatNum((Number(r.delta_max_mm) || 0) / (((Number(formData.span_length_m) || 0) * 1000) / 300 || 1), 2)}x the limit. Beam stiffness EI = ${formData.E_GPa} GPa x ${formData.I_m4} m4 = ${formatNum((Number(formData.E_GPa) || 0) * (Number(formData.I_m4) || 0) * 1000)} kN.m2 controls this behavior. IS 800 Cl.5.6.1 result: ${c.deflection_ok ? "PASS" : "FAIL"}.`,
      normal_stress: `Normal stress (sigma = M x y / I) shows bending stress at the extreme fiber. Maximum value of ${formatNum(r.sigma_max_MPa)} MPa occurs at the peak moment location. Yield strength of ${formData.steel_grade} steel: fy = ${fy} MPa. Stress ratio = sigma / fy = ${formatNum(c.stress_ratio || 0, 3)}. IS 800 permits maximum 0.9 x fy = ${formatNum(0.9 * fy)} MPa in bending. IS 800 Cl.8.2 result: ${c.bending_ok ? "PASS" : "FAIL"}.`,
      shear_stress: `Shear stress (tau = V.Q / I.b) shows shear distribution across the section. Maximum shear stress of ${formatNum(r.tau_max_MPa)} MPa occurs at the support region. IS 800 Cl.8.4 permissible shear stress: 0.6 x fy = ${formatNum(0.6 * fy)} MPa. Your shear stress is ${formatNum((Number(r.tau_max_MPa) || 0) / (0.6 * fy || 1), 3)}x the permissible limit. IS 800 Cl.8.4 result: ${c.shear_ok ? "PASS" : "FAIL"}.`,
      load_vs_deflection: `This parametric plot shows max deflection as load scales from 10% to 200% of design load. At design load (multiplier = 1.0), max deflection = ${formatNum(result?.plots?.load_vs_deflection?.critical_points?.design_deflection_mm || 0)} mm. The linear relationship confirms elastic behavior assumed by IS 800. Beam flexibility coefficient = ${formatNum(result?.plots?.load_vs_deflection?.critical_points?.slope_mm_per_multiplier || 0)} mm per kN.m of applied moment.`,
    };
    return templates[key] || "";
  }, [formData, recommendations.fyLabel, result]);

  const explanationText = useMemo(() => getExplanationForKey(activePlotKey), [activePlotKey, getExplanationForKey]);
  const isLaptopRange = viewportWidth >= 1024 && viewportWidth <= 1280;
  const graphHeight = isLaptopRange ? 360 : 420;
  const leftColumnWidth = isLaptopRange ? 260 : 300;

  const downloadReport = async () => {
    if (!result || !graphRef.current) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const stamp = new Date();
    const scenario = result?.inputs_normalized?.scenario_label || "Unknown";
    const imageMap = {};
    const margin = 20;
    const maxWidth = 170; // A4 width minus margins

    for (const opt of OPTIONS) {
      const canvas = await graphRef.current.capturePlot(opt.key);
      if (canvas) imageMap[opt.key] = canvas.toDataURL("image/png");
    }
    graphRef.current.setPlot(activePlotKey);

    // Page 1: Title
    pdf.setFontSize(20);
    pdf.text(sanitizeForPDF("OsdagBridge Structural Analysis Report"), margin, 30);
    pdf.setFontSize(12);
    pdf.text(sanitizeForPDF("IS 800 / IS 456 Compliant Beam Analysis"), margin, 40);
    pdf.text(sanitizeForPDF(`Date: ${stamp.toLocaleString()}`), margin, 48);
    pdf.text(sanitizeForPDF(`Scenario: ${scenario}`), margin, 56);

    // Page 2: Input Summary
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text("Input Summary", margin, 20);
    const rows = Object.entries(formData).map(([k, v]) => `${k}: ${v}`);
    pdf.setFontSize(10);
    rows.forEach((row, idx) => pdf.text(sanitizeForPDF(row), margin, 30 + idx * 6));

    // Page 3: Results Summary
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text("Results Summary", margin, 20);
    const rs = result.results_summary || {};
    const cc = result.code_checks || {};
    const summary = [
      `Max Shear Force: ${formatNum(rs.V_max_kN)} kN`,
      `Max Bending Moment: ${formatNum(rs.M_max_kNm)} kN.m`,
      `Max Deflection: ${formatNum(rs.delta_max_mm)} mm (${cc.deflection_ok ? "PASS" : "FAIL"})`,
      `Max Normal Stress: ${formatNum(rs.sigma_max_MPa)} MPa (${cc.bending_ok ? "PASS" : "FAIL"})`,
      `Max Shear Stress: ${formatNum(rs.tau_max_MPa)} MPa (${cc.shear_ok ? "PASS" : "FAIL"})`,
      `Reaction A: ${formatNum(result?.reactions?.R_A)} kN, Reaction B: ${formatNum(result?.reactions?.R_B)} kN`,
    ];
    pdf.setFontSize(10);
    summary.forEach((line, idx) => pdf.text(sanitizeForPDF(line), margin, 30 + idx * 8));

    // Pages 4-9: Graphs + Explanations
    for (const opt of OPTIONS) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text(sanitizeForPDF(opt.label), margin, 20);
      if (imageMap[opt.key]) {
        pdf.addImage(imageMap[opt.key], "PNG", 15, 28, 180, 95);
      }
      const pdfText = getPDFExplanationForKey(opt.key);
      pdf.setFontSize(10);
      addWrappedText(pdf, pdfText, margin, 132, maxWidth, 7);
    }

    // Final page: Compliance
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text("IS Code Compliance Summary", margin, 20);
    pdf.setFontSize(11);
    pdf.text(sanitizeForPDF(`Deflection IS 800 Cl.5.6.1: ${result?.code_checks?.deflection_ok ? "PASS" : "FAIL"}`), margin, 34);
    pdf.text(sanitizeForPDF(`Bending IS 800 Cl.8.2: ${result?.code_checks?.bending_ok ? "PASS" : "FAIL"}`), margin, 44);
    pdf.text(sanitizeForPDF(`Shear IS 800 Cl.8.4: ${result?.code_checks?.shear_ok ? "PASS" : "FAIL"}`), margin, 54);
    pdf.save(`OsdagBridge_Report_${Date.now()}.pdf`);
  };

  const onKnowMore = (fieldName) => {
    if (helpSectionRef.current) {
      helpSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setHighlightedField(fieldName);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedField(null), 2000);
  };

  const onBackToInputs = () => {
    if (inputBarRef.current) {
      inputBarRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (hasAutoRunRef.current) return;
    hasAutoRunRef.current = true;
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text-primary)", overflowX: "hidden", background: "var(--page-gradient)" }}>
      <motion.div
        className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300"
        style={{ scaleX: progressX }}
      />
      <ThemeToggle />
      <div className="mx-auto w-full px-4 py-4">
        <header className="mb-3">
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]"
          >
            <span className="heading-gradient">
              Osdag-Inspired Bridge Analysis
            </span>
          </motion.h1>
          {!prefersReducedMotion && (
            <motion.div
              className="mt-1 h-[2px] w-44 rounded-full bg-gradient-to-r from-blue-400/80 to-emerald-300/80"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 176, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.45 }}
            />
          )}
          <p style={{ marginTop: "8px", fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "700px" }}>
            Simply supported • UDL + point load • Strict validation • Premium engineering dashboard
          </p>
        </header>

        {/* Row 1: Input toolbar (fields only) */}
        <div ref={inputBarRef}>
          <TopInputToolbar
            formData={formData}
            setField={setField}
            toasts={toasts}
            recommendations={recommendations}
            onFieldBlur={validateAndToast}
            onFieldKeyDown={onFieldKeyDown}
            onKnowMore={onKnowMore}
            compactWidths={isLaptopRange}
          />
        </div>

        {/* Row 2: Action bar (warnings + buttons) */}
        <ActionBar
          onSubmit={onSubmit}
          onReset={onReset}
          loading={loading}
          hardBlock={hardBlock}
          crossWarnings={crossWarnings}
        />

        {/* Row 3: Results */}
        <main className="mt-3 flex flex-col xl:flex-row items-start gap-4">
          <section
            style={{
              width: viewportWidth >= 1280 ? `${leftColumnWidth}px` : "100%",
              flexShrink: 0,
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              padding: "12px",
            }}
          >
            <div id="system-overview" style={{ borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-card)", padding: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>System Overview</div>
              <BridgeIllustration />
            </div>
            <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-card)", padding: "12px" }}>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Reaction at A (R_A)</div>
                <div style={{ marginTop: "4px", fontSize: "22px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatNum(result?.reactions?.R_A)} kN <span style={{ color: "var(--badge-pass-text)" }}>↑</span>
                </div>
              </div>
              <div style={{ borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-card)", padding: "12px" }}>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Reaction at B (R_B)</div>
                <div style={{ marginTop: "4px", fontSize: "22px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatNum(result?.reactions?.R_B)} kN <span style={{ color: "var(--badge-pass-text)" }}>↑</span>
                </div>
              </div>
            </div>
            <div id="compliance-badges" style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <div
                style={{
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: `1px solid ${result?.code_checks?.deflection_ok ? "var(--badge-pass-text)" : "var(--badge-fail-text)"}`,
                  background: result?.code_checks?.deflection_ok ? "var(--badge-pass-bg)" : "var(--badge-fail-bg)",
                  color: result?.code_checks?.deflection_ok ? "var(--badge-pass-text)" : "var(--badge-fail-text)",
                }}
              >
                {result?.code_checks?.deflection_ok ? "✓" : "✗"} Deflection IS 800 Cl.5.6.1
              </div>
              <div
                style={{
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: `1px solid ${result?.code_checks?.bending_ok ? "var(--badge-pass-text)" : "var(--badge-fail-text)"}`,
                  background: result?.code_checks?.bending_ok ? "var(--badge-pass-bg)" : "var(--badge-fail-bg)",
                  color: result?.code_checks?.bending_ok ? "var(--badge-pass-text)" : "var(--badge-fail-text)",
                }}
              >
                {result?.code_checks?.bending_ok ? "✓" : "✗"} Bending IS 800 Cl.8.2
              </div>
              <div
                style={{
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: `1px solid ${result?.code_checks?.shear_ok ? "var(--badge-pass-text)" : "var(--badge-fail-text)"}`,
                  background: result?.code_checks?.shear_ok ? "var(--badge-pass-bg)" : "var(--badge-fail-bg)",
                  color: result?.code_checks?.shear_ok ? "var(--badge-pass-text)" : "var(--badge-fail-text)",
                }}
              >
                {result?.code_checks?.shear_ok ? "✓" : "✗"} Shear Stress IS 800 Cl.8.4
              </div>
            </div>
          </section>

          <section
            style={{
              minWidth: 0,
              flex: 1,
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              padding: "12px",
            }}
          >
            <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Hover plots to see exact (x, y)</div>
              <button
                id="download-report-btn"
                type="button"
                onClick={downloadReport}
                style={{
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Download Report
              </button>
            </div>
            {error && (
              <div style={{ marginBottom: "8px", borderRadius: "12px", border: "1px solid var(--badge-fail-text)", background: "var(--badge-fail-bg)", padding: "8px", fontSize: "13px", color: "var(--badge-fail-text)" }}>
                {error.message}
              </div>
            )}
            {!!warnings.length && (
              <div style={{ marginBottom: "8px", borderRadius: "12px", border: "1px solid var(--warning-text)", background: "var(--warning-bg)", padding: "8px", fontSize: "13px", color: "var(--warning-text)" }}>
                {warnings.map((w, i) => (
                  <div key={`${i}-${w.code || "w"}`}>{w.message || String(w)}</div>
                ))}
              </div>
            )}
            <div>
              <AnalysisGraphPanel ref={graphRef} result={result || {}} onPlotChange={setActivePlotKey} graphHeight={graphHeight} />
            </div>
            <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setExplanationOpen((v) => !v)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <span>What this diagram tells you</span>
                <span>{explanationOpen ? "▲" : "▼"}</span>
              </button>
              <div
                className="explanation-scrollbar"
                style={{
                  overflowY: "auto",
                  transition: "max-height 0.3s ease-in-out",
                  maxHeight: explanationOpen ? "180px" : "0px",
                }}
              >
                <p style={{ marginTop: "8px", fontSize: "14px", lineHeight: 1.75, color: "var(--text-secondary)" }}>
                  {explanationText}
                </p>
              </div>
            </div>
          </section>
        </main>
        <div ref={helpSectionRef}>
          <HelpSection onBackToTop={onBackToInputs} activeHelpId={highlightedField} />
        </div>

        <OnboardingTour />
      </div>
    </div>
  );
}
