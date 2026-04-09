import React, { useEffect, useState } from "react";

const STORAGE_KEY = "osdag_theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  // Read preference on mount (before first paint via useEffect)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.remove("theme-light");
      localStorage.setItem(STORAGE_KEY, "dark");
    } else {
      document.documentElement.classList.add("theme-light");
      localStorage.setItem(STORAGE_KEY, "light");
    }
    // Dispatch custom event so AnalysisGraphPanel can re-read CSS vars
    window.dispatchEvent(new CustomEvent("themechange"));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        top: "16px",
        right: "24px",
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        border: isDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid #D1D5DB",
        background: isDark ? "rgba(15,17,23,0.9)" : "rgba(255,255,255,0.95)",
        color: isDark ? "rgba(255,255,255,0.85)" : "#111827",
        backdropFilter: "blur(8px)",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}
    >
      <span style={{ fontSize: "16px" }}>{isDark ? "☀" : "☾"}</span>
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
