// Shared tokens + components for Research Gap Finder

const RGF = {
  // Warm neutral base
  bg: '#F1EEE8',
  surface: '#FFFFFF',
  ink: '#0E0E0C',
  inkSoft: '#4A4742',
  muted: '#8A8680',
  hair: 'rgba(14,14,12,0.08)',

  // Pastel category palette (low chroma)
  mint: '#D7E8D4',      // methodology
  lavender: '#E2D9EE',  // population / PICO
  butter: '#F5EBB8',    // LLM synthesis
  peach: '#F5D9C8',     // geography
  sky: '#CFE0EA',       // future-work
  rose: '#ECD1D1',
  sage: '#C4D1B5',

  // Type
  display: '"Instrument Serif", "Times New Roman", serif',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

// Tiny line-art glyphs (no emoji, no SVG portraits)
function Icon({ name, size = 20, color = '#0E0E0C', stroke = 1.6 }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    search:   <><circle cx="10" cy="10" r="6" {...p}/><path d="M15 15l4 4" {...p}/></>,
    plus:     <><path d="M12 5v14M5 12h14" {...p}/></>,
    bell:     <><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16z" {...p}/><path d="M10 20a2 2 0 004 0" {...p}/></>,
    home:     <><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" {...p}/></>,
    grid:     <><rect x="4" y="4" width="7" height="7" rx="1.5" {...p}/><rect x="13" y="4" width="7" height="7" rx="1.5" {...p}/><rect x="4" y="13" width="7" height="7" rx="1.5" {...p}/><rect x="13" y="13" width="7" height="7" rx="1.5" {...p}/></>,
    person:   <><circle cx="12" cy="8" r="4" {...p}/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" {...p}/></>,
    book:     <><path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" {...p}/><path d="M5 4v13a3 3 0 003 3" {...p}/></>,
    chart:    <><path d="M4 20V8m6 12V4m6 16v-8" {...p}/></>,
    flask:    <><path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" {...p}/></>,
    globe:    <><circle cx="12" cy="12" r="8" {...p}/><path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16" {...p}/></>,
    sparkle:  <><path d="M12 4l1.8 4.7L18 10l-4.2 1.3L12 16l-1.8-4.7L6 10l4.2-1.3L12 4z" {...p}/></>,
    clock:    <><circle cx="12" cy="12" r="8" {...p}/><path d="M12 8v4l3 2" {...p}/></>,
    target:   <><circle cx="12" cy="12" r="8" {...p}/><circle cx="12" cy="12" r="4" {...p}/><circle cx="12" cy="12" r="1" {...p}/></>,
    quote:    <><path d="M7 8h3v4a3 3 0 01-3 3M14 8h3v4a3 3 0 01-3 3" {...p}/></>,
    arrow:    <><path d="M5 12h14M13 6l6 6-6 6" {...p}/></>,
    chevR:    <><path d="M9 5l7 7-7 7" {...p}/></>,
    chevD:    <><path d="M5 9l7 7 7-7" {...p}/></>,
    chevU:    <><path d="M5 15l7-7 7 7" {...p}/></>,
    close:    <><path d="M6 6l12 12M18 6L6 18" {...p}/></>,
    check:    <><path d="M5 13l4 4L19 7" {...p}/></>,
    filter:   <><path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" {...p}/></>,
    download: <><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" {...p}/></>,
    share:    <><circle cx="6" cy="12" r="2.5" {...p}/><circle cx="18" cy="6" r="2.5" {...p}/><circle cx="18" cy="18" r="2.5" {...p}/><path d="M8 11l8-4M8 13l8 4" {...p}/></>,
    bookmark: <><path d="M6 4h12v17l-6-4-6 4V4z" {...p}/></>,
    link:     <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" {...p}/></>,
    spark:    <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" {...p}/></>,
    dna:      <><path d="M6 4c0 4 12 4 12 8s-12 4-12 8M18 4c0 4-12 4-12 8s12 4 12 8" {...p}/><path d="M8 6h8M8 18h8M9 9h6M9 15h6" {...p}/></>,
    microscope: <><path d="M9 3h4v2h-4zM10 5l-3 8h6l-3-8zM5 20h14M8 20l1-3h6l1 3" {...p}/></>,
    note:     <><path d="M5 4h10l4 4v12H5V4zM15 4v4h4" {...p}/><path d="M8 12h8M8 16h6" {...p}/></>,
    mic:      <><rect x="9" y="3" width="6" height="11" rx="3" {...p}/><path d="M5 11a7 7 0 0014 0M12 18v3" {...p}/></>,
    bolt:     <><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" {...p}/></>,
    layers:   <><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" {...p}/></>,
    settings: <><circle cx="12" cy="12" r="3" {...p}/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" {...p}/></>,
    paperclip:<><path d="M20 11l-8 8a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8" {...p}/></>,
    upload:   <><path d="M12 20V8m0 0l-5 5m5-5l5 5M5 4h14" {...p}/></>,
    gap:      <><path d="M4 12h5M15 12h5" {...p}/><circle cx="12" cy="12" r="3" {...p}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

// Black circular icon button (as seen in inspo)
function BlackPill({ children, size = 52, style = {} }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size/2,
      background: RGF.ink, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>{children}</div>
  );
}

// White squircle chip with a line icon
function ChipIcon({ name, size = 44, iconSize = 20, bg = '#fff', color = RGF.ink }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 14,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      border: bg === '#fff' ? `1px solid ${RGF.hair}` : 'none',
    }}>
      <Icon name={name} size={iconSize} color={color} />
    </div>
  );
}

// Bottom floating nav (black pill + white pill) like the inspo
function FloatingNav({ active = 'home' }) {
  const Item = ({ name, glyph, isActive }) => (
    <div style={{
      width: 52, height: 52, borderRadius: 26,
      background: isActive ? RGF.ink : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={glyph} size={22} color={isActive ? '#fff' : RGF.ink} stroke={1.7}/>
    </div>
  );
  return (
    <div style={{
      position: 'absolute', bottom: 28, left: '50%',
      transform: 'translateX(-50%)', zIndex: 40,
      background: '#fff', borderRadius: 40, padding: 6,
      display: 'flex', gap: 4,
      boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
      border: `1px solid ${RGF.hair}`,
    }}>
      <Item name="home" glyph="home" isActive={active === 'home'} />
      <Item name="library" glyph="layers" isActive={active === 'library'} />
      <Item name="analyze" glyph="sparkle" isActive={active === 'analyze'} />
      <Item name="me" glyph="person" isActive={active === 'me'} />
    </div>
  );
}

// Score dial — small circular gauge for novelty / feasibility
function ScoreDial({ value = 7, max = 10, label = 'Novelty', color = RGF.ink, size = 44 }) {
  const r = size/2 - 3;
  const c = 2 * Math.PI * r;
  const pct = value / max;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke={RGF.hair} strokeWidth="3" fill="none"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1-pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
          fontFamily={RGF.sans} fontSize="13" fontWeight="600" fill={RGF.ink}>
          {value}
        </text>
      </svg>
      <div style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// Category pill
function CategoryPill({ kind }) {
  const map = {
    'future-work':  { bg: RGF.sky, label: 'Future work' },
    'methodology':  { bg: RGF.mint, label: 'Methodology' },
    'pico':         { bg: RGF.lavender, label: 'PICO' },
    'llm':          { bg: RGF.butter, label: 'AI synthesis' },
    'geography':    { bg: RGF.peach, label: 'Geography' },
    'population':   { bg: RGF.rose, label: 'Population' },
  };
  const c = map[kind] || map['methodology'];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 999,
      background: c.bg, fontFamily: RGF.sans, fontSize: 12,
      fontWeight: 500, color: RGF.ink, letterSpacing: -0.1,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: RGF.ink, opacity: 0.6 }}/>
      {c.label}
    </div>
  );
}

Object.assign(window, { RGF, Icon, BlackPill, ChipIcon, FloatingNav, ScoreDial, CategoryPill });
