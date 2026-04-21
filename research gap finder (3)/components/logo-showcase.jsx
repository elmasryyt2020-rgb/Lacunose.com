// Logo showcase — a dedicated design panel on the canvas
// Shows: 4 logo variants, size ramp, on light/dark, wordmark, favicon grid, construction

function LogoShowcase({ appName }) {
  const variants = [
    { id: 'gap', name: 'Gap', desc: 'Two dashes around a dot — reads as an interval with something found inside.' },
    { id: 'bracket', name: 'Bracket', desc: 'Containment — a scholarly bracket holding the signal.' },
    { id: 'ellipsis', name: 'Pause', desc: 'Three-dot rhythm — mid-thought discovery.' },
    { id: 'aperture', name: 'Aperture', desc: 'Lens — narrowing to an unanswered question.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, width: 1520, flexShrink: 0 }}>

      {/* Recommended mark — large hero */}
      <div style={{
        background: '#fff', borderRadius: 32, padding: 48,
        border: `1px solid ${RGF.hair}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 10 }}>
            Primary mark
          </div>
          <div style={{ fontFamily: RGF.display, fontSize: 56, letterSpacing: -1.6, color: RGF.ink, lineHeight: 1, marginBottom: 20, fontWeight: 400 }}>
            The <em>gap mark.</em>
          </div>
          <div style={{ fontSize: 15, color: RGF.inkSoft, lineHeight: 1.55, marginBottom: 24, maxWidth: 480 }}>
            Two dashes with a focal dot. Reads as the lacuna — the space between what's been said. Black squircle container, white dashes, butter-yellow dot for warmth.
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 14px', borderRadius: 99, background: RGF.bg, fontSize: 12, fontFamily: RGF.mono, color: RGF.inkSoft }}>32% corner radius</div>
            <div style={{ padding: '8px 14px', borderRadius: 99, background: RGF.bg, fontSize: 12, fontFamily: RGF.mono, color: RGF.inkSoft }}>Ink #0E0E0C</div>
            <div style={{ padding: '8px 14px', borderRadius: 99, background: RGF.bg, fontSize: 12, fontFamily: RGF.mono, color: RGF.inkSoft }}>Butter #F5EBB8</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Logo size={240}/>
        </div>
      </div>

      {/* Variants row */}
      <div>
        <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 14 }}>
          Variant exploration · pick one
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {variants.map((v, i) => (
            <div key={v.id} style={{
              background: '#fff', borderRadius: 24, padding: 24,
              border: i === 0 ? `2px solid ${RGF.ink}` : `1px solid ${RGF.hair}`,
              position: 'relative',
            }}>
              {i === 0 && (
                <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 99, background: RGF.ink, color: '#fff', fontSize: 10, fontWeight: 500, letterSpacing: 0.3 }}>
                  PICKED
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 24px' }}>
                <Logo size={112} variant={v.id}/>
              </div>
              <div style={{ fontFamily: RGF.display, fontSize: 22, color: RGF.ink, letterSpacing: -0.4, marginBottom: 4 }}>{v.name}</div>
              <div style={{ fontSize: 12, color: RGF.muted, lineHeight: 1.45 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Size ramp + on light/dark */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 28, border: `1px solid ${RGF.hair}` }}>
          <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 18 }}>Size ramp</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
            {[20, 28, 40, 56, 80, 112].map(s => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Logo size={s}/>
                <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>{s}px</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: 24, padding: 28, background: RGF.ink, color: '#fff' }}>
          <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 18 }}>On dark · inverted</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', padding: '20px 0' }}>
            <Logo size={80} bg="#fff" dash={RGF.ink} dot={RGF.butter}/>
            <Logo size={80} bg="transparent" dash="#fff" dot={RGF.butter} radius={0}/>
            <Logo size={80} bg="#fff" dash={RGF.ink} dot={RGF.ink}/>
          </div>
        </div>
      </div>

      {/* Wordmark + lockups */}
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, border: `1px solid ${RGF.hair}` }}>
        <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 18 }}>Wordmark lockups</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Wordmark name={appName} size={56}/>
          <Wordmark name={appName} size={36}/>
          <Wordmark name={appName} size={22}/>
        </div>
      </div>

      {/* Favicon grid */}
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, border: `1px solid ${RGF.hair}` }}>
        <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 18 }}>App-icon context</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {/* Classic iOS icon – rounded square, darker bg */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={108} radius={26}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>ink bg</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={108} radius={26} bg={RGF.butter} dash={RGF.ink} dot={RGF.ink}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>butter</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={108} radius={26} bg={RGF.sky} dash={RGF.ink} dot={RGF.ink}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>sky</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={108} radius={26} bg="#fff" dash={RGF.ink} dot={RGF.ink}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>white</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={56}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>favicon 56</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={32}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>favicon 32</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Logo size={16}/>
            <div style={{ fontFamily: RGF.mono, fontSize: 10, color: RGF.muted }}>16</div>
          </div>
        </div>
      </div>

      {/* Construction — simple guides */}
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, border: `1px solid ${RGF.hair}` }}>
        <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 18 }}>Construction</div>
        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 240, height: 240 }}>
            {/* grid */}
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute' }}>
              <defs>
                <pattern id="cg" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M24 0H0V24" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="240" height="240" fill="url(#cg)"/>
              <rect x="4" y="4" width="232" height="232" rx="76" fill="none" stroke={RGF.sky} strokeWidth="1.2"/>
              <circle cx="120" cy="120" r="104" fill="none" stroke={RGF.rose} strokeWidth="1.2"/>
              <line x1="0" y1="120" x2="240" y2="120" stroke={RGF.mint} strokeWidth="1.2"/>
              <line x1="120" y1="0" x2="120" y2="240" stroke={RGF.mint} strokeWidth="1.2"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={232} radius={76}/>
            </div>
          </div>
          <div style={{ flex: 1, fontSize: 14, color: RGF.inkSoft, lineHeight: 1.6, maxWidth: 420 }}>
            <div style={{ fontFamily: RGF.display, fontSize: 24, color: RGF.ink, letterSpacing: -0.4, marginBottom: 10 }}>
              Proportions
            </div>
            <div style={{ marginBottom: 8 }}>• Container: 32% corner radius on its own width</div>
            <div style={{ marginBottom: 8 }}>• Dashes: 28% width, 5.5% height, pill-rounded</div>
            <div style={{ marginBottom: 8 }}>• Focal dot: 26% of container width</div>
            <div style={{ marginBottom: 8 }}>• Gap between dash inner-edge and dot: 14% of container</div>
            <div style={{ marginTop: 14, fontSize: 12, color: RGF.muted }}>
              Scales cleanly from 16px favicon to 512px app icon with no rasterizing artifacts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Name suggestions panel
function NameSuggestions() {
  const names = [
    { n: 'Lacuna', meaning: 'Latin for an unfilled space or gap.', tone: 'Scholarly', picked: true },
    { n: 'Null', meaning: 'The null result — what the field hasn\'t said.', tone: 'Sharp' },
    { n: 'Hypothes', meaning: 'From hypothesis — a stub pointing forward.', tone: 'Direct' },
    { n: 'Margin', meaning: 'Work happens in the margins of the literature.', tone: 'Warm' },
    { n: 'Unsaid', meaning: 'The papers haven\'t written it yet.', tone: 'Editorial' },
    { n: 'Aperture', meaning: 'Narrow to the open question.', tone: 'Optical' },
    { n: 'Penumbra', meaning: 'The half-lit edge of a field.', tone: 'Poetic' },
    { n: 'Sieve', meaning: 'Strain the literature for what falls through.', tone: 'Utilitarian' },
  ];
  return (
    <div style={{
      width: 820, flexShrink: 0, background: '#fff', borderRadius: 28, padding: 36,
      border: `1px solid ${RGF.hair}`, fontFamily: RGF.sans,
    }}>
      <div style={{ fontFamily: RGF.mono, fontSize: 11, letterSpacing: 2, color: RGF.muted, textTransform: 'uppercase', marginBottom: 8 }}>Name suggestions</div>
      <div style={{ fontFamily: RGF.display, fontSize: 40, letterSpacing: -1, color: RGF.ink, marginBottom: 18, fontWeight: 400 }}>
        Eight <em>candidates.</em>
      </div>
      <div style={{ fontSize: 13, color: RGF.inkSoft, lineHeight: 1.5, marginBottom: 24, maxWidth: 560 }}>
        All-English except the first two, all short, all a single clean concept. "Lacuna" is what I've used in this design — a real scientific term for a missing piece in the evidence base — but pick whichever one feels right.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {names.map(n => (
          <div key={n.n} style={{
            background: n.picked ? RGF.butter : RGF.bg,
            borderRadius: 18, padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 6,
            border: n.picked ? `1px solid ${RGF.ink}` : `1px solid ${RGF.hair}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: RGF.display, fontSize: 32, letterSpacing: -0.8, color: RGF.ink, fontWeight: 400 }}>
                {n.n}<span style={{ fontStyle: 'italic' }}>.</span>
              </div>
              <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>{n.tone}</div>
            </div>
            <div style={{ fontSize: 13, color: RGF.inkSoft, lineHeight: 1.4 }}>{n.meaning}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LogoShowcase, NameSuggestions });
