import { useMemo } from "react";

const FY_BY_GRADE = {
  Fe250: 250,
  Fe350: 350,
  Fe415: 415,
  Fe500: 500,
  Fe550: 550,
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function useCrossFieldWarnings(formData) {
  return useMemo(() => {
    const warnings = [];
    const L = toNum(formData.span_length_m);
    const w = toNum(formData.dead_load_kN_per_m);
    const y = toNum(formData.section_y_m);
    const I = toNum(formData.I_m4);
    const fy = FY_BY_GRADE[formData.steel_grade] ?? 350;

    if (L && w && y && I && I > 0) {
      // sigma_estimated = (w*L²/8 * y)/I
      const m = (w * Math.pow(L, 2)) / 8;
      const sigma = (m * y) / I;
      if (sigma > 0.9 * fy) {
        warnings.push("Warning: Estimated stress ratio exceeds 0.9. Section may fail strength check.");
      }
    }

    if (L && L > 25) {
      warnings.push("Long span detected. Deflection serviceability (L/300) may be critical.");
    }

    return warnings;
  }, [formData]);
}

