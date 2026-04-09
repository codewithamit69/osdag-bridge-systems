import React from 'react';
import { Ruler, Weight, Anchor, FastForward, Activity, Zap, Shield, Maximize2, MoveVertical, LineChart } from 'lucide-react';

const helpItems = [
  {
    id: 'span_length_m',
    title: 'Span Length (m)',
    icon: <Ruler className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />,
    meaning:
      'The span length is the distance between the two supports. It defines the total length of the beam being analyzed.',
    effect:
      'Longer spans generally increase bending moments and deflections for the same loads, making serviceability (deflection limits) more likely to fail.',
    tip: 'Valid range: 1 to 200 m.',
  },
  {
    id: 'dead_load_kN_per_m',
    title: 'Dead Load UDL (kN/m)',
    icon: <Weight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />,
    meaning:
      'Dead load is the uniformly distributed load (UDL) acting along the entire span (e.g., self-weight + permanent loads).',
    effect:
      'Increasing UDL raises shear force and bending moment everywhere, and significantly increases deflection.',
    tip: 'Valid range: 0.1 to 500 kN/m.',
  },
  {
    id: 'point_load_kN',
    title: 'Point Load (kN)',
    icon: <Anchor className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />,
    meaning:
      'A point load is a concentrated load applied at a specific location along the span (e.g., a vehicle wheel load).',
    effect:
      'It creates a sharp change in shear at the load position and increases bending moment near the region around the load.',
    tip: 'Must be ≥ 0 kN.',
  },
  {
    id: 'load_position_m',
    title: 'Load Position x (m)',
    icon: <MoveVertical className="w-5 h-5 text-pink-400 group-hover:text-pink-300" />,
    meaning:
      'This is the location (measured from the left support) where the point load is applied.',
    effect:
      'Moving the point load changes reactions, shear distribution, and where the peak bending moment occurs (often near the zero-shear location).',
    tip: 'Must be within 0 to L.',
  },
  {
    id: 'impact_factor',
    title: 'Impact Factor (0–0.5)',
    icon: <FastForward className="w-5 h-5 text-red-400 group-hover:text-red-300" />,
    meaning:
      'Impact factor is a multiplier used to account for dynamic effects (like vehicle impact). In this model it scales the UDL.',
    effect:
      'Higher impact factor increases effective loading, raising moments, deflections, and stresses.',
    tip: 'If you enter > 0.5, the system clamps it to 0.5 and warns you.',
  },
  {
    id: 'steel_grade',
    title: 'Steel Grade',
    icon: <Shield className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />,
    meaning:
      'Steel grade selects the yield strength f_y used for the strength check. Higher grades have higher f_y.',
    effect:
      'Higher f_y allows higher stresses before failing the strength check (stress ratio σ_max / f_y).',
    tip: 'Supported: Fe250, Fe350, Fe415, Fe500, Fe550.',
  },
  {
    id: 'E_GPa',
    title: "Young's Modulus E (GPa)",
    icon: <Zap className="w-5 h-5 text-amber-400 group-hover:text-amber-300" />,
    meaning:
      "E measures stiffness of the material. Steel is typically around 200 GPa. Higher E means the beam is stiffer.",
    effect:
      'Higher E reduces deflection (δ). Moments and shear do not change, but deflection decreases.',
    tip: 'Override is allowed only within ±5% of 200 GPa (backend hard block).',
  },
  {
    id: 'I_m4',
    title: 'Moment of Inertia I (m⁴)',
    icon: <Maximize2 className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />,
    meaning:
      'I is the second moment of area of the cross-section. It strongly controls bending stiffness (E·I).',
    effect:
      'Higher I drastically reduces deflection and stress (since σ = M·y / I). Very small I can cause huge deflections/stresses.',
    tip: 'Valid range: 1e-8 to 1.0 m⁴, and must be > 0.',
  },
  {
    id: 'section_y_m',
    title: 'Section y (m)',
    icon: <Activity className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />,
    meaning:
      'y is the distance from the neutral axis to the extreme fiber where stress is evaluated.',
    effect:
      'Higher y increases bending stress (σ = M·y/I). It does not change moment/shear, only stress.',
    tip: 'Must be > 0.',
  },
  {
    id: 'n_points',
    title: 'Plot Points (50–100)',
    icon: <LineChart className="w-5 h-5 text-teal-400 group-hover:text-teal-300" />,
    meaning:
      'Number of sample points used along the span to draw smooth curves.',
    effect:
      'More points make plots smoother but slightly increase compute time.',
    tip: 'Allowed: 50 to 100.',
  },
];

export function HelpSection({ onBackToTop, activeHelpId }) {
  return (
    <section
      id="help"
      style={{
        marginTop: "16px",
        borderRadius: "16px",
        border: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--accent-blue)" }}>Know More: Inputs Explained</h2>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Click the "i" icon near a field to jump to its explanation and highlight it.
          </div>
        </div>
        <button
          style={{
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-input)",
            padding: "8px 12px",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
          type="button"
          onClick={onBackToTop}
        >
          Back to inputs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-6">
        {helpItems.map((it) => (
          <article
            key={it.id}
            id={`help-${it.id}`}
            className={[
              "group rounded-2xl border p-4 transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10",
              activeHelpId === it.id ? "helpPulse" : "",
            ].join(" ")}
            style={{
              borderColor: activeHelpId === it.id ? "var(--accent-blue)" : "var(--border-color)",
              background: activeHelpId === it.id ? "rgba(59,130,246,0.1)" : "var(--bg-card)",
              ...(activeHelpId === it.id ? { boxShadow: "0 0 20px rgba(59,130,246,0.25)" } : {}),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: 500, fontSize: "16px", color: "var(--accent-blue)" }}>
              {it.icon}
              {it.title}
            </div>
            <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, marginTop: "12px" }}>
              <div>
                <strong style={{ color: "var(--text-primary)" }}>What it means:</strong> {it.meaning}
              </div>
              <div style={{ marginTop: "8px" }}>
                <strong style={{ color: "var(--text-primary)" }}>How it affects results:</strong> {it.effect}
              </div>
              <div style={{ marginTop: "8px", fontSize: "13px" }}>
                <strong style={{ color: "var(--text-primary)" }}>Quick tip:</strong> {it.tip}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
