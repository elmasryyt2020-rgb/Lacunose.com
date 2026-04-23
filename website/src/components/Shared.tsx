/**
 * Shared UI primitives for the Lacunose website.
 *
 * Mirrors the mobile app's `components/Shared.tsx` but in plain React. Both
 * the landing page (`app/page.tsx`) and the beta web app (`app/app/page.tsx`)
 * import from here so design drift between the two is impossible.
 *
 * All components reference CSS variables defined in `app/globals.css`
 * (`--ink`, `--bg`, `--surface`, `--hair`, `--mint`, `--lavender`, `--butter`,
 * `--peach`, `--sky`, `--rose`, `--sage`, `--display`, `--sans`, `--mono`) —
 * no hardcoded colors in this file.
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export type IconName =
  | 'search' | 'plus' | 'close' | 'check' | 'arrow'
  | 'chevL' | 'chevR' | 'chevU' | 'chevD'
  | 'bookmark' | 'book' | 'bolt' | 'quote' | 'globe'
  | 'sparkle' | 'gap' | 'target' | 'layers'
  | 'clock' | 'filter' | 'share' | 'download'
  | 'flask' | 'microscope' | 'dna' | 'mail' | 'eye'
  | 'refresh' | 'spinner';

export function SvgIcon({
  name, size = 24, color = 'var(--ink)', stroke = 1.6,
}: {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const p = {
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  let paths: React.ReactNode = null;
  switch (name) {
    case 'search':  paths = <><circle cx="11" cy="11" r="6" {...p} /><path d="M20 20l-4-4" {...p} /></>; break;
    case 'plus':    paths = <path d="M12 5v14M5 12h14" {...p} />; break;
    case 'close':   paths = <path d="M6 6l12 12M18 6L6 18" {...p} />; break;
    case 'check':   paths = <path d="M5 13l4 4L19 7" {...p} />; break;
    case 'arrow':   paths = <path d="M5 12h14M13 6l6 6-6 6" {...p} />; break;
    case 'chevL':   paths = <path d="M15 6l-6 6 6 6" {...p} />; break;
    case 'chevR':   paths = <path d="M9 6l6 6-6 6" {...p} />; break;
    case 'chevU':   paths = <path d="M6 15l6-6 6 6" {...p} />; break;
    case 'chevD':   paths = <path d="M6 9l6 6 6-6" {...p} />; break;
    case 'bookmark': paths = <path d="M7 4h10v16l-5-4-5 4V4z" {...p} />; break;
    case 'book':    paths = <><path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" {...p} /><path d="M5 4v13a3 3 0 003 3" {...p} /></>; break;
    case 'bolt':    paths = <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" {...p} />; break;
    case 'quote':   paths = <path d="M7 8h3v4a3 3 0 01-3 3M14 8h3v4a3 3 0 01-3 3" {...p} />; break;
    case 'globe':   paths = <><circle cx="12" cy="12" r="8" {...p} /><path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16" {...p} /></>; break;
    case 'sparkle': paths = <path d="M12 4l1.8 4.7L18 10l-4.2 1.3L12 16l-1.8-4.7L6 10l4.2-1.3L12 4z" {...p} />; break;
    case 'gap':     paths = <><path d="M4 12h5M15 12h5" {...p} /><circle cx="12" cy="12" r="3" {...p} /></>; break;
    case 'target':  paths = <><circle cx="12" cy="12" r="8" {...p} /><circle cx="12" cy="12" r="4" {...p} /><circle cx="12" cy="12" r="1" {...p} /></>; break;
    case 'layers':  paths = <><path d="M12 3l9 5-9 5-9-5 9-5z" {...p} /><path d="M3 13l9 5 9-5" {...p} /><path d="M3 17l9 5 9-5" {...p} /></>; break;
    case 'clock':   paths = <><circle cx="12" cy="12" r="8" {...p} /><path d="M12 7v5l3 2" {...p} /></>; break;
    case 'filter':  paths = <path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" {...p} />; break;
    case 'share':   paths = <><circle cx="6" cy="12" r="2" {...p} /><circle cx="18" cy="6" r="2" {...p} /><circle cx="18" cy="18" r="2" {...p} /><path d="M8 11l8-4M8 13l8 4" {...p} /></>; break;
    case 'download': paths = <><path d="M12 4v12M7 11l5 5 5-5" {...p} /><path d="M4 20h16" {...p} /></>; break;
    case 'flask':   paths = <path d="M9 3h6v5l4 9a3 3 0 01-2.8 4H7.8A3 3 0 015 17l4-9V3z" {...p} />; break;
    case 'microscope': paths = <><path d="M9 3h4v6h-4z" {...p} /><path d="M11 9v6M7 20h10M6 15a6 6 0 0012 0" {...p} /></>; break;
    case 'dna':     paths = <><path d="M6 3c4 3 8 9 12 18M18 3c-4 3-8 9-12 18" {...p} /><path d="M8 7h8M8 11h8M8 15h8" {...p} /></>; break;
    case 'mail':    paths = <><rect x="3" y="5" width="18" height="14" rx="2" {...p} /><path d="M3 7l9 6 9-6" {...p} /></>; break;
    case 'eye':     paths = <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...p} /><circle cx="12" cy="12" r="3" {...p} /></>; break;
    case 'refresh': paths = <><path d="M3 12a9 9 0 0115.5-6.3L21 8M21 4v4h-4" {...p} /><path d="M21 12a9 9 0 01-15.5 6.3L3 16M3 20v-4h4" {...p} /></>; break;
    case 'spinner': paths = <><circle cx="12" cy="12" r="8" stroke="var(--hair)" strokeWidth={stroke} fill="none" /><path d="M20 12a8 8 0 00-8-8" {...p} /></>; break;
    default:        paths = <circle cx="12" cy="12" r="8" {...p} />;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths}</svg>;
}

// ---------------------------------------------------------------------------
// ScoreDial — circular progress gauge for novelty / feasibility scores.
// ---------------------------------------------------------------------------

export function ScoreDial({
  value = 7, max = 10, label = 'Novelty', size = 44, color = 'var(--ink)',
}: {
  value?: number;
  max?: number;
  label?: string;
  size?: number;
  color?: string;
}) {
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--hair)" strokeWidth="3" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
          fontFamily="var(--sans)" fontWeight="600" fontSize="13" fill="var(--ink)"
        >{value}</text>
      </svg>
      <span style={{
        fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)',
        letterSpacing: 0.3, textTransform: 'uppercase',
      }}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryPill — small rounded tag for gap categories.
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  'future-work':    'var(--sky)',
  'methodology':    'var(--mint)',
  'pico':           'var(--lavender)',
  'llm':            'var(--butter)',
  'geographic':     'var(--peach)',
  'population':     'var(--butter)',
  'coverage':       'var(--lavender)',
  'contradiction':  'var(--rose)',
  'intersection':   'var(--sage)',
  'temporal':       'var(--sky)',
};

const CATEGORY_LABELS: Record<string, string> = {
  'future-work':   'Future work',
  'methodology':   'Methodology',
  'pico':          'PICO',
  'llm':           'LLM',
  'geographic':    'Geographic',
  'population':    'Population',
  'coverage':      'Coverage',
  'contradiction': 'Contradiction',
  'intersection':  'Intersection',
  'temporal':      'Temporal',
};

export function CategoryPill({ kind }: { kind: string }) {
  const bg = CATEGORY_COLORS[kind] ?? 'var(--hair)';
  const label = CATEGORY_LABELS[kind] ?? kind;
  return (
    <span
      className="category-pill"
      style={{ background: bg }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: 3,
        background: 'rgba(14,14,12,0.6)', display: 'inline-block',
      }} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChipIcon — rounded-square icon button (header nav, close buttons).
// ---------------------------------------------------------------------------

export function ChipIcon({
  name, size = 44, iconSize = 20, onClick, ariaLabel,
}: {
  name: IconName;
  size?: number;
  iconSize?: number;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? name}
      className="chip-icon"
      style={{
        width: size, height: size,
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
      }}
    >
      <SvgIcon name={name} size={iconSize} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// RankBadge — colored square number used at the top of a gap card.
// ---------------------------------------------------------------------------

const RANK_COLORS = ['var(--lavender)', 'var(--mint)', 'var(--sky)', 'var(--butter)', 'var(--peach)', 'var(--rose)', 'var(--sage)'];

export function RankBadge({ rank, size = 40 }: { rank: number; size?: number }) {
  const bg = RANK_COLORS[(rank - 1) % RANK_COLORS.length] ?? 'var(--mint)';
  return (
    <div
      style={{
        width: size, height: size,
        background: bg,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--display)', fontSize: size * 0.5,
        color: 'var(--ink)',
        flexShrink: 0,
      }}
    >{rank}</div>
  );
}
