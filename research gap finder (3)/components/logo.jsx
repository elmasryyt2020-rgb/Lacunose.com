// Logo system — extracted as a reusable component

// A "gap" logo — two dashes with a focal dot in the middle; feels like an
// interval, a bracket, a target. Size-controlled via `size` (square bounding box).
function Logo({ size = 56, bg = '#0E0E0C', dash = '#FFFFFF', dot = '#F5EBB8', radius = null, variant = 'gap' }) {
  const r = radius ?? size * 0.32;

  if (variant === 'gap') {
    // Two lines, gap in the middle, dot
    const dashW = size * 0.28;
    const dashH = size * 0.055;
    const dotR = size * 0.13;
    const offset = size * 0.14;
    return (
      <div style={{
        width: size, height: size, borderRadius: r, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', flexShrink: 0,
      }}>
        <div style={{ width: dashW, height: dashH, background: dash, borderRadius: dashH/2, marginRight: offset }}/>
        <div style={{
          width: dotR*2, height: dotR*2, borderRadius: dotR, background: dot,
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        }}/>
        <div style={{ width: dashW, height: dashH, background: dash, borderRadius: dashH/2, marginLeft: offset }}/>
      </div>
    );
  }

  if (variant === 'bracket') {
    // Brackets facing each other with a dot inside
    const bw = size * 0.055;
    const bh = size * 0.42;
    const dotR = size * 0.13;
    return (
      <div style={{
        width: size, height: size, borderRadius: r, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', flexShrink: 0,
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${size*0.30} ${size*0.29} L${size*0.22} ${size*0.29} L${size*0.22} ${size*0.71} L${size*0.30} ${size*0.71}`}
            fill="none" stroke={dash} strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round"/>
          <path d={`M${size*0.70} ${size*0.29} L${size*0.78} ${size*0.29} L${size*0.78} ${size*0.71} L${size*0.70} ${size*0.71}`}
            fill="none" stroke={dash} strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={size/2} cy={size/2} r={dotR} fill={dot}/>
        </svg>
      </div>
    );
  }

  if (variant === 'ellipsis') {
    // Three dots with the middle emphasized — a pause between thoughts
    const dotR = size * 0.085;
    const big = size * 0.14;
    return (
      <div style={{
        width: size, height: size, borderRadius: r, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: size * 0.1, flexShrink: 0,
      }}>
        <div style={{ width: dotR*2, height: dotR*2, borderRadius: dotR, background: dash, opacity: 0.5 }}/>
        <div style={{ width: big*2, height: big*2, borderRadius: big, background: dot }}/>
        <div style={{ width: dotR*2, height: dotR*2, borderRadius: dotR, background: dash, opacity: 0.5 }}/>
      </div>
    );
  }

  if (variant === 'aperture') {
    // Concentric ring with an asymmetric notch — lens / discovery
    return (
      <div style={{
        width: size, height: size, borderRadius: r, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', flexShrink: 0,
      }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="28" fill="none" stroke={dash} strokeWidth="6"/>
          <path d="M 50 22 A 28 28 0 0 1 78 50" fill="none" stroke={dot} strokeWidth="6" strokeLinecap="round"/>
          <circle cx="50" cy="50" r="6" fill={dot}/>
        </svg>
      </div>
    );
  }

  return null;
}

// Wordmark — "name" in serif with a logo glyph beside it
function Wordmark({ name = 'Lacuna', size = 24, color = '#0E0E0C', glyph = true, glyphSize = null, bg = '#0E0E0C', dot = '#F5EBB8' }) {
  const gs = glyphSize ?? size * 1.4;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.5 }}>
      {glyph && <Logo size={gs} bg={bg} dot={dot}/>}
      <div style={{
        fontFamily: RGF.display, fontSize: size, color, letterSpacing: -size * 0.035,
        fontWeight: 400, lineHeight: 1,
      }}>
        {name}<span style={{ fontStyle: 'italic' }}>.</span>
      </div>
    </div>
  );
}

Object.assign(window, { Logo, Wordmark });
