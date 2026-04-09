import React from "react";

export function ActionBar({
  onSubmit,
  onReset,
  loading,
  hardBlock,
  crossWarnings,
}) {
  return (
    <section
      id="action-bar"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 24px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        minHeight: "52px",
        borderRadius: "0 0 16px 16px",
        marginTop: "-4px",
      }}
    >
      {/* Left: warnings */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {crossWarnings.map((w, i) => (
          <div
            key={`${w}-${i}`}
            style={{
              background: "var(--warning-bg)",
              color: "var(--warning-text)",
              border: "1px solid var(--warning-text)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "14px",
              lineHeight: "1.4",
              opacity: 0.9,
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Right: buttons */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          disabled={loading}
          onClick={onReset}
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "15px",
            border: "1px solid var(--border-color)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "all 0.2s ease",
          }}
        >
          Reset
        </button>
        <button
          id="analyze-btn"
          type="button"
          disabled={loading || hardBlock}
          onClick={onSubmit}
          style={{
            background: hardBlock
              ? "var(--text-muted)"
              : "var(--accent-blue)",
            color: "#ffffff",
            padding: "10px 28px",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: 500,
            border: "none",
            cursor: loading || hardBlock ? "not-allowed" : "pointer",
            minWidth: "110px",
            opacity: loading || hardBlock ? 0.5 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </section>
  );
}
