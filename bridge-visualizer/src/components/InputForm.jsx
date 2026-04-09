import React from 'react';

function KnowMoreButton({ onClick, label }) {
  return (
    <button
      type="button"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[12px] font-extrabold text-slate-100 hover:bg-white/10 transition"
      onClick={onClick}
      aria-label={`Know more about ${label}`}
      title={`Know more about ${label}`}
    >
      i
    </button>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  const text = Array.isArray(error) ? error.join(' ') : String(error);
  return <div className="mt-1 text-xs text-red-200">{text}</div>;
}

function InputGroup({ value, onChange, type = 'number', step, unit, placeholder }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-stretch gap-2">
      <input
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
        type={type}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {unit ? (
        <span className="inline-flex min-w-[4rem] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-xs font-bold text-slate-100/90">
          {unit}
        </span>
      ) : null}
    </div>
  );
}

export function InputForm({
  apiBaseUrl,
  setApiBaseUrl,
  formData,
  setFormData,
  onSubmit,
  onReset,
  loading,
  fieldErrors,
  onKnowMore,
}) {
  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-4 lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-extrabold text-blue-100">Inputs</h2>
        <div className="text-xs text-slate-300">Units shown • Hard blocks appear under fields</div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="field">
            <label className="block text-xs text-slate-300 mb-1">API Base URL</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="/api"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Span Length</span>
              <KnowMoreButton onClick={() => onKnowMore('span_length_m')} label="Span Length" />
            </label>
            <InputGroup
              value={formData.span_length_m}
              onChange={(v) => setField('span_length_m', v)}
              step="0.001"
              unit="m"
              placeholder="e.g., 20"
            />
            <FieldError error={fieldErrors?.span_length_m} />
          </div>

          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Dead Load (UDL)</span>
              <KnowMoreButton onClick={() => onKnowMore('dead_load_kN_per_m')} label="Dead Load UDL" />
            </label>
            <InputGroup
              value={formData.dead_load_kN_per_m}
              onChange={(v) => setField('dead_load_kN_per_m', v)}
              step="0.01"
              unit="kN/m"
              placeholder="e.g., 5"
            />
            <FieldError error={fieldErrors?.dead_load_kN_per_m} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Point Load</span>
              <KnowMoreButton onClick={() => onKnowMore('point_load_kN')} label="Point Load" />
            </label>
            <InputGroup
              value={formData.point_load_kN}
              onChange={(v) => setField('point_load_kN', v)}
              step="0.01"
              unit="kN"
              placeholder="e.g., 50"
            />
            <FieldError error={fieldErrors?.point_load_kN} />
          </div>

          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Load Position x</span>
              <KnowMoreButton onClick={() => onKnowMore('load_position_m')} label="Load Position" />
            </label>
            <InputGroup
              value={formData.load_position_m}
              onChange={(v) => setField('load_position_m', v)}
              step="0.001"
              unit="m"
              placeholder="e.g., 10"
            />
            <FieldError error={fieldErrors?.load_position_m} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Impact Factor</span>
              <KnowMoreButton onClick={() => onKnowMore('impact_factor')} label="Impact Factor" />
            </label>
            <InputGroup
              value={formData.impact_factor}
              onChange={(v) => setField('impact_factor', v)}
              step="0.001"
              unit="(0–0.5)"
              placeholder="e.g., 0.1"
            />
            <FieldError error={fieldErrors?.impact_factor} />
          </div>

          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Steel Grade</span>
              <KnowMoreButton onClick={() => onKnowMore('steel_grade')} label="Steel Grade" />
            </label>
            <div className="grid grid-cols-[1fr_auto] items-stretch gap-2">
              <select
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                value={formData.steel_grade}
                onChange={(e) => setField('steel_grade', e.target.value)}
              >
                <option value="Fe250">Fe250</option>
                <option value="Fe350">Fe350</option>
                <option value="Fe415">Fe415</option>
                <option value="Fe500">Fe500</option>
                <option value="Fe550">Fe550</option>
              </select>
              <span className="inline-flex min-w-[4rem] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-xs font-bold text-slate-100/90">
                f_y
              </span>
            </div>
            <FieldError error={fieldErrors?.steel_grade} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>E (Young’s Modulus)</span>
              <KnowMoreButton onClick={() => onKnowMore('E_GPa')} label="E (Young’s Modulus)" />
            </label>
            <InputGroup
              value={formData.E_GPa}
              onChange={(v) => setField('E_GPa', v)}
              step="0.01"
              unit="GPa"
              placeholder="e.g., 200"
            />
            <FieldError error={fieldErrors?.E_GPa} />
          </div>

          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>I (Moment of Inertia)</span>
              <KnowMoreButton onClick={() => onKnowMore('I_m4')} label="I (Moment of Inertia)" />
            </label>
            <InputGroup
              value={formData.I_m4}
              onChange={(v) => setField('I_m4', v)}
              step="0.0000000001"
              unit="m⁴"
              placeholder="e.g., 0.0002"
            />
            <FieldError error={fieldErrors?.I_m4} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Section y</span>
              <KnowMoreButton onClick={() => onKnowMore('section_y_m')} label="Section y" />
            </label>
            <InputGroup
              value={formData.section_y_m}
              onChange={(v) => setField('section_y_m', v)}
              step="0.001"
              unit="m"
              placeholder="e.g., 0.25"
            />
            <FieldError error={fieldErrors?.section_y_m} />
          </div>

          <div className="field">
            <label className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
              <span>Plot Points</span>
              <KnowMoreButton onClick={() => onKnowMore('n_points')} label="Plot Points" />
            </label>
            <InputGroup
              value={formData.n_points}
              onChange={(v) => setField('n_points', v)}
              type="number"
              step="1"
              unit="(50–100)"
              placeholder="e.g., 99"
            />
            <FieldError error={fieldErrors?.n_points} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            className="rounded-xl bg-blue-500 px-4 py-2.5 font-extrabold text-slate-950 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-slate-100 hover:bg-white/10 transition disabled:opacity-60"
            type="button"
            onClick={onReset}
            disabled={loading}
          >
            Reset example
          </button>
        </div>
      </form>
    </section>
  );
}

