import React, { Suspense } from 'react';

// Code-split Plotly to significantly improve initial page load performance
const Plot = React.lazy(() => import('react-plotly.js'));

export const PlotCard = React.memo(function PlotCard({ title, plotlySpec }) {
  if (!plotlySpec) return null;
  const { data, layout } = plotlySpec;
  
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 h-full flex flex-col">
      {title && (
        <div className="mb-2 text-sm font-extrabold text-slate-100">
          {title}
        </div>
      )}
      <div className="flex-1 w-full relative min-h-[300px]">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm animate-pulse">
            Loading interactive plot...
          </div>
        }>
          <Plot
            data={data}
            layout={{
              ...layout,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94a3b8', family: 'Inter, sans-serif' },
              xaxis: { 
                ...layout.xaxis,
                gridcolor: '#334155',
                zerolinecolor: '#475569',
                showline: false
              },
              yaxis: { 
                ...layout.yaxis,
                gridcolor: '#334155',
                zerolinecolor: '#475569',
                showline: false
              },
              margin: { l: 50, r: 20, t: 30, b: 40 },
            }}
            style={{ width: '100%', height: '300px' }}
            useResizeHandler={true}
            config={{ responsive: true, displaylogo: false }}
          />
        </Suspense>
      </div>
    </div>
  );
});

