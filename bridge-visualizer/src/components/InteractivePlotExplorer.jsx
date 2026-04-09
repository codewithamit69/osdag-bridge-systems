import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
} from 'recharts';

// ─── Physics Math Engine ────────────────────────────────────────────────────
const N = 60;
const L = 30;

function generatePlotData(scenario, plotType) {
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = parseFloat(((i / N) * L).toFixed(4));
    let y = 0;

    if (scenario === 'simple_udl') {
      const w = 10;
      const moment = (w * x * (L - x)) / 2;
      switch (plotType) {
        case 'sfd':    y = w * (L / 2 - x); break;
        case 'bmd':    y = moment; break;
        case 'deflection': y = moment * 0.05; break;
        case 'stress': y = moment * 0.8; break;
        default: y = 0;
      }
    } else {
      // Point Load at Midspan: P=100, a=L/2
      const P = 100;
      const a = L / 2;
      const moment = x <= a ? (P / 2) * x : (P / 2) * (L - x);
      switch (plotType) {
        case 'sfd':
          if (x < a)  y = P / 2;
          else if (x > a) y = -(P / 2);
          else y = 0;
          break;
        case 'bmd':    y = moment; break;
        case 'deflection': y = moment * 0.04; break;
        case 'stress': y = moment * 0.8; break;
        default: y = 0;
      }
    }

    points.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(4)) });
  }
  return points;
}

// ─── Config maps ─────────────────────────────────────────────────────────────
const PLOT_LABELS = {
  sfd:        { label: 'Shear Force (kN)',      color: '#60a5fa' },
  bmd:        { label: 'Bending Moment (kNm)',  color: '#34d399' },
  deflection: { label: 'Deflection (mm)',       color: '#f59e0b' },
  stress:     { label: 'Stress (MPa)',          color: '#f87171' },
};

// ─── Custom dark tooltip ──────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-slate-400 mb-1">x: <span className="text-slate-100 font-bold">{label}m</span></p>
      <p className="text-slate-400">val: <span className="font-bold" style={{ color: payload[0].color }}>{Number(payload[0].value).toFixed(2)}</span></p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InteractivePlotExplorer({ result, loading, formData, setFormData }) {
  const [plotType, setPlotType] = useState('sfd');
  const [scenario, setScenario] = useState('simple_udl');

  const data = useMemo(() => generatePlotData(scenario, plotType), [scenario, plotType]);
  const { label: yLabel, color: lineColor } = PLOT_LABELS[plotType];

  const handleScenarioChange = (e) => {
    const val = e.target.value;
    setScenario(val);
    // Also sync to form so Analyze re-runs with correct params
    if (val === 'simple_udl' && setFormData) {
      setFormData((prev) => ({ ...prev, point_load_kN: '0' }));
    } else if (val === 'midspan_point' && setFormData) {
      const span = Number(formData?.span_length_m) || 20;
      setFormData((prev) => ({
        ...prev,
        dead_load_kN_per_m: '0',
        load_position_m: String(span / 2),
      }));
    }
  };

  // Find max-absolute y for reference line / annotation
  const peakPoint = data.reduce(
    (best, d) => (Math.abs(d.y) > Math.abs(best.y) ? d : best),
    { x: 0, y: 0 }
  );
  const zeroPoint = data.find((d, i) => {
    if (i === 0) return false;
    return (data[i - 1].y > 0 && d.y <= 0) || (data[i - 1].y < 0 && d.y >= 0);
  });

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* ── Chart area ─────────────────────────────────────────────────────── */}
      <div className="relative bg-[#0d1117] p-4">
        <AnimatePresence>
          {loading && (
            <motion.div
              key="spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <span className="text-sm font-bold text-blue-300">Recalculating…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${plotType}-${scenario}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />

                <XAxis
                  dataKey="x"
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                >
                  <Label
                    value="Position along Span (m)"
                    position="insideBottomRight"
                    offset={-10}
                    style={{ fill: '#64748b', fontSize: 11 }}
                  />
                </XAxis>

                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  width={60}
                >
                  <Label
                    value={yLabel}
                    angle={-90}
                    position="insideLeft"
                    offset={10}
                    style={{ fill: '#64748b', fontSize: 11, textAnchor: 'middle' }}
                  />
                </YAxis>

                <Tooltip content={<DarkTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />

                {/* Zero crossing reference */}
                <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} />

                {/* Peak annotation */}
                {peakPoint.y !== 0 && (
                  <ReferenceLine
                    x={peakPoint.x}
                    stroke="transparent"
                    label={{
                      value: 'Peak',
                      position: peakPoint.y > 0 ? 'insideTopRight' : 'insideBottomRight',
                      style: { fill: '#f87171', fontSize: 10, fontWeight: 700 },
                    }}
                  />
                )}

                {/* Zero shear annotation */}
                {zeroPoint && plotType === 'sfd' && (
                  <ReferenceLine
                    x={zeroPoint.x}
                    stroke="transparent"
                    label={{
                      value: 'Zero Shear',
                      position: 'insideTopRight',
                      style: { fill: '#fb923c', fontSize: 10, fontWeight: 600 },
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: lineColor, stroke: '#0f172a', strokeWidth: 2 }}
                />

                {/* Peak dot */}
                {peakPoint.y !== 0 && (
                  <ReferenceLine
                    x={peakPoint.x}
                    y={peakPoint.y}
                    stroke="transparent"
                    dot={{ r: 5, fill: '#f87171', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Control bar ────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-t border-slate-700/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 text-slate-100">
          <Activity size={15} className="text-blue-400" />
          <span className="text-xs font-extrabold text-blue-100">Analysis Type</span>
        </div>

        <select
          value={plotType}
          onChange={(e) => setPlotType(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition cursor-pointer"
        >
          <option value="sfd">Shear Force (kN)</option>
          <option value="bmd">Bending Moment (kNm)</option>
          <option value="deflection">Deflection (mm)</option>
          <option value="stress">Stress (MPa)</option>
        </select>

        <div className="flex items-center gap-2 text-slate-100 sm:ml-6">
          <span className="text-xs font-extrabold text-blue-100">Loading Scenario</span>
        </div>

        <select
          value={scenario}
          onChange={handleScenarioChange}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition cursor-pointer"
        >
          <option value="simple_udl">Simple UDL</option>
          <option value="midspan_point">Concentrated Load at Midspan</option>
          <option value="irc_aa" disabled>IRC Class AA (Simplified)</option>
          <option value="irc_70r" disabled>IRC Class 70R (Simplified)</option>
        </select>
      </div>
    </div>
  );
}

