import React from 'react';

export function BridgeIllustration() {
  return (
    <svg
      viewBox="0 0 520 140"
      width="100%"
      height="100%"
      role="img"
      aria-label="Bridge analysis illustration"
    >
      <defs>
        <linearGradient id="beam-dark" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(120,162,255,0.9)" />
          <stop offset="1" stopColor="rgba(92,240,166,0.85)" />
        </linearGradient>
        <linearGradient id="beam-light" x1="0" x2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="deck-dark" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        <linearGradient id="deck-light" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.12)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.06)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="520" height="140" fill="var(--svg-bg)" rx="12" />

      {/* supports */}
      <polygon points="70,115 95,115 82.5,90" fill="var(--svg-support)" />
      <polygon points="425,115 450,115 437.5,90" fill="var(--svg-support)" />

      {/* deck */}
      <rect className="bridge-deck" x="85" y="62" width="350" height="20" rx="10"
        style={{ fill: "var(--svg-bg)" }}
      />

      {/* beam */}
      <rect className="bridge-beam" x="95" y="78" width="330" height="10" rx="5"
        style={{ fill: "var(--accent-blue)" }}
      />

      {/* UDL arrows */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = 110 + i * 26;
        return (
          <g key={i}>
            <line x1={x} y1={30} x2={x} y2={58} stroke="var(--svg-udl)" strokeWidth="2" />
            <polygon
              points={`${x - 5},58 ${x + 5},58 ${x},66`}
              fill="var(--svg-udl)"
            />
          </g>
        );
      })}

      {/* point load */}
      <line x1="260" y1="18" x2="260" y2="60" stroke="rgba(255,107,107,0.95)" strokeWidth="3" />
      <polygon points="252,60 268,60 260,74" fill="rgba(255,107,107,0.95)" />

      {/* axis */}
      <line x1="95" y1="115" x2="425" y2="115" stroke="var(--border-color)" strokeWidth="2" />
      <line x1="95" y1="112" x2="95" y2="118" stroke="var(--border-color)" strokeWidth="2" />
      <line x1="425" y1="112" x2="425" y2="118" stroke="var(--border-color)" strokeWidth="2" />
      <text x="95" y="135" fill="var(--text-secondary)" fontSize="12">
        x=0
      </text>
      <text x="405" y="135" fill="var(--text-secondary)" fontSize="12">
        x=L
      </text>
    </svg>
  );
}
