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

export function useRecommendations(formData) {
  return useMemo(() => {
    const L = toNum(formData.span_length_m);
    const w = toNum(formData.dead_load_kN_per_m);
    const E = toNum(formData.E_GPa);
    const impact = toNum(formData.impact_factor) ?? 0;
    const fy = FY_BY_GRADE[formData.steel_grade] ?? 350;

    const rec = {
      fyLabel: fy,
      load_position_m: null,
      I_m4: null,
      E_GPa: null,
    };

    if (L && L > 0) {
      rec.load_position_m = (L / 2).toFixed(3);
    }

    if (L && L > 0 && w && w > 0) {
      // I = (w * L^4) / (384 * E * delta_limit), delta_limit = L/300
      // Using consistent SI-like approximation with kN/m, GPa, mm converted in denominator scale.
      const deltaLimitM = L / 300;
      const usedE = E && E > 0 ? E : 200;
      const effectiveW = w * (1 + Math.max(0, impact));
      const iRec = (effectiveW * Math.pow(L, 4)) / (384 * usedE * deltaLimitM * 1000);
      if (Number.isFinite(iRec) && iRec > 0) {
        rec.I_m4 = iRec.toExponential(6);
      }
    }

    if (E !== null && (E < 190 || E > 210)) {
      rec.E_GPa = "200";
    }

    return rec;
  }, [formData]);
}

