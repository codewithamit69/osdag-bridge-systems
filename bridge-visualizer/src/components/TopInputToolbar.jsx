import React from "react";

const FIELDS = [
  { key: "span_length_m", label: "Span Length", unit: "m", type: "number", step: "0.001" },
  { key: "dead_load_kN_per_m", label: "Dead Load", unit: "kN/m", type: "number", step: "0.01" },
  { key: "point_load_kN", label: "Point Load", unit: "kN", type: "number", step: "0.01" },
  { key: "load_position_m", label: "Load Position", unit: "m", type: "number", step: "0.001" },
  { key: "impact_factor", label: "Impact Factor", unit: "-", type: "number", step: "0.001" },
  { key: "steel_grade", label: "Steel Grade", unit: "", type: "select" },
  { key: "E_GPa", label: "E", unit: "GPa", type: "number", step: "0.01" },
  { key: "I_m4", label: "I", unit: "m4", type: "number", step: "0.00000001" },
  { key: "section_y_m", label: "Section y", unit: "m", type: "number", step: "0.001" },
  { key: "n_points", label: "Plot Points", unit: "", type: "number", step: "1" },
];

const FIELD_WIDTHS = {
  span_length_m: 70,
  dead_load_kN_per_m: 70,
  point_load_kN: 70,
  load_position_m: 70,
  impact_factor: 65,
  steel_grade: 105,
  E_GPa: 65,
  I_m4: 90,
  section_y_m: 70,
  n_points: 65,
};

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={[
        "absolute left-0 top-full z-20 mt-1 rounded-md px-2 py-1 text-[11px] shadow-lg transition-all duration-300",
        toast.level === "warn" ? "bg-amber-400/95 text-slate-900" : "bg-red-500/95 text-white",
        toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none",
      ].join(" ")}
    >
      {toast.message}
    </div>
  );
}

export function TopInputToolbar({
  formData,
  setField,
  toasts,
  recommendations,
  onFieldBlur,
  onFieldKeyDown,
  onKnowMore,
  compactWidths = false,
}) {
  return (
    <section
      id="input-bar"
      style={{
        width: "100%",
        borderRadius: "16px 16px 0 0",
        border: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        padding: "12px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="toolbar-scrollbar"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "flex-end",
          gap: "10px",
          overflowX: "hidden",
          padding: "8px 16px",
        }}
      >
        {FIELDS.map((field) => {
          const rec = recommendations?.[field.key];
          const value = formData[field.key];
          const placeholder = rec ? `${rec}` : "";
          const fieldWidth = Math.max(
            52,
            (FIELD_WIDTHS[field.key] || 70) - (compactWidths ? 8 : 0)
          );
          return (
            <div key={field.key} className="relative shrink-0">
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                }}
              >
                {field.label}
                {field.key === "steel_grade" && (
                  <span
                    style={{
                      marginLeft: "4px",
                      fontSize: "12px",
                      color: "var(--badge-pass-text)",
                    }}
                  >
                    fy: {recommendations.fyLabel} MPa
                  </span>
                )}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {field.type === "select" ? (
                  <select
                    style={{
                      height: "36px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-input)",
                      padding: "0 8px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      width: `${fieldWidth}px`,
                    }}
                    value={value}
                    onChange={(e) => setField(field.key, e.target.value)}
                    onBlur={() => onFieldBlur(field.key)}
                  >
                    <option value="Fe250">Fe250</option>
                    <option value="Fe350">Fe350</option>
                    <option value="Fe415">Fe415</option>
                    <option value="Fe500">Fe500</option>
                    <option value="Fe550">Fe550</option>
                  </select>
                ) : (
                  <input
                    style={{
                      height: "36px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-input)",
                      padding: "0 8px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      width: `${fieldWidth}px`,
                    }}
                    value={value}
                    type={field.type}
                    step={field.step}
                    placeholder={placeholder}
                    onChange={(e) => setField(field.key, e.target.value)}
                    onBlur={() => onFieldBlur(field.key)}
                    onKeyDown={(e) => onFieldKeyDown(e, field.key)}
                  />
                )}
                {field.unit ? (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {field.unit}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onKnowMore(field.key)}
                  style={{
                    display: "inline-flex",
                    height: "20px",
                    width: "20px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                  aria-label={`Know more about ${field.label}`}
                >
                  i
                </button>
              </div>
              {rec && (
                <div
                  style={{
                    marginTop: "2px",
                    fontSize: "12px",
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                  }}
                >
                  Recommended: {rec}. Press Tab to accept.
                </div>
              )}
              <Toast toast={toasts[field.key]} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
