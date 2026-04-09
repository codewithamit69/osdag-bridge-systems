import { useCallback, useMemo, useRef, useState } from "react";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const HARD_BLOCK_FIELDS = new Set([
  "span_length_m",
  "dead_load_kN_per_m",
  "point_load_kN",
  "load_position_m",
  "E_GPa",
  "I_m4",
  "section_y_m",
  "n_points",
]);

export function useValidation(formData) {
  const [toasts, setToasts] = useState({});
  const timersRef = useRef({});

  const triggerToast = useCallback((field, message, level = "error") => {
    setToasts((prev) => ({ ...prev, [field]: { message, level, visible: true } }));
    if (timersRef.current[field]) {
      clearTimeout(timersRef.current[field]);
    }
    timersRef.current[field] = setTimeout(() => {
      setToasts((prev) => ({ ...prev, [field]: prev[field] ? { ...prev[field], visible: false } : prev[field] }));
    }, 3000);
  }, []);

  const fieldErrors = useMemo(() => {
    const errs = {};
    const L = toNum(formData.span_length_m);
    const w = toNum(formData.dead_load_kN_per_m);
    const P = toNum(formData.point_load_kN);
    const x = toNum(formData.load_position_m);
    const impact = toNum(formData.impact_factor);
    const E = toNum(formData.E_GPa);
    const I = toNum(formData.I_m4);
    const y = toNum(formData.section_y_m);
    const nPoints = toNum(formData.n_points);

    if (L !== null && (L < 1 || L > 200)) errs.span_length_m = "Span must be between 1 m and 200 m";
    if (w !== null && (w < 0.1 || w > 500)) errs.dead_load_kN_per_m = "UDL must be between 0.1 and 500 kN/m";
    if (P !== null && P < 0) errs.point_load_kN = "Point load must be ≥ 0 kN";
    if (x !== null && L !== null && (x < 0 || x > L)) errs.load_position_m = `Position must be between 0 and span length (currently ${L} m)`;
    if (impact !== null && impact > 0.5) errs.impact_factor = "Impact factor clamped to 0.5 — value adjusted automatically";
    if (E !== null && (E < 190 || E > 210)) errs.E_GPa = "Override beyond ±5% of 200 GPa is blocked by IS 800";
    if (I !== null && (I < 1e-8 || I > 1.0)) errs.I_m4 = "I must be between 1e-8 and 1.0 m⁴";
    if (y !== null && y <= 0) errs.section_y_m = "Section y must be > 0";
    if (nPoints !== null && (nPoints < 50 || nPoints > 100)) errs.n_points = "Plot points must be between 50 and 100";

    return errs;
  }, [formData]);

  const hardBlock = useMemo(() => {
    return Object.keys(fieldErrors).some((k) => HARD_BLOCK_FIELDS.has(k) && k !== "impact_factor");
  }, [fieldErrors]);

  const validateAndToast = useCallback(
    (field) => {
      const msg = fieldErrors[field];
      if (!msg) return;
      const level = field === "impact_factor" ? "warn" : "error";
      triggerToast(field, msg, level);
    },
    [fieldErrors, triggerToast]
  );

  return {
    fieldErrors,
    toasts,
    hardBlock,
    validateAndToast,
  };
}

