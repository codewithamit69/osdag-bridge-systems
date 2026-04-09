import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BridgeIllustration } from './BridgeIllustration';
import { AnalysisGraphPanel } from './AnalysisGraphPanel';

function Banner({ kind, title, children, onDismiss }) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/5 p-3",
        kind === "Warn" ? "border-amber-300/30 bg-amber-300/10" : "",
        kind === "Error" ? "border-red-400/30 bg-red-400/10" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-extrabold text-slate-100">{title}</div>
        {onDismiss ? (
          <button
            className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 transition"
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="mt-2 text-sm text-slate-100/90">{children}</div>
    </div>
  );
}

export function ResultsDashboard({
  result,
  warnings,
  error,
  loading,
  onDismissWarnings,
}) {
  const checks = result?.code_checks;
  const reactions = result?.reactions;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-extrabold text-blue-100">Results</h2>
        <div className="text-xs text-slate-300">Hover plots to see exact (x, y)</div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs font-extrabold text-slate-200">System Overview</div>
        <div className="mt-2">
          <BridgeIllustration />
        </div>
      </div>


      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-3"
          >
            <Banner kind="Error" title="Hard block (400)">
              <div className="font-mono text-sm">{error.message}</div>
              {error.details && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-100/90">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              )}
            </Banner>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {loading && !result ? (
          <motion.div
            key="initial-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="mt-3 h-3 w-72 rounded bg-white/10" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="h-3 w-44 rounded bg-white/10" />
                  <div className="mt-3 h-[320px] rounded-xl bg-white/10" />
                </div>
              ))}
            </div>
          </motion.div>
        ) : result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {warnings?.length > 0 && (
              <div className="mb-3">
                <Banner kind="Warn" title="Warnings" onDismiss={onDismissWarnings}>
                  <ul className="list-disc ml-5">
                    {warnings.map((w, idx) => (
                      <li key={`${w.code || 'warn'}-${idx}`}>{w.message || JSON.stringify(w)}</li>
                    ))}
                  </ul>
                </Banner>
              </div>
            )}

            <AnalysisGraphPanel result={result} />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                <div className="text-xs text-slate-300">Reaction at A (R_A)</div>
                <div className="mt-1 text-xl font-bold text-slate-100">{Number(reactions?.R_A || 0).toFixed(3)} kN <span className="text-emerald-300">↑</span></div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                <div className="text-xs text-slate-300">Reaction at B (R_B)</div>
                <div className="mt-1 text-xl font-bold text-slate-100">{Number(reactions?.R_B || 0).toFixed(3)} kN <span className="text-emerald-300">↑</span></div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className={`rounded-full px-3 py-1 text-xs font-bold border transition ${checks?.deflection_ok ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-200" : "bg-red-400/20 border-red-300/40 text-red-200"}`}>
                {checks?.deflection_ok ? "✓" : "✗"} Deflection IS 800 Cl.5.6.1
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-bold border transition ${checks?.bending_ok ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-200" : "bg-red-400/20 border-red-300/40 text-red-200"}`}>
                {checks?.bending_ok ? "✓" : "✗"} Bending IS 800 Cl.8.2
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-bold border transition ${checks?.shear_ok ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-200" : "bg-red-400/20 border-red-300/40 text-red-200"}`}>
                {checks?.shear_ok ? "✓" : "✗"} Shear Stress IS 800 Cl.8.4
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-slate-300"
          >
            A default example should auto-run. If not, click <strong>Analyze</strong>.
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

