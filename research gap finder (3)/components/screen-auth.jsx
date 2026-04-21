// Get Started + Onboarding + Sign Up + Login screens
// The onboarding flow walks user thru a real gap exploration and paywalls the reveal.

function ScreenGetStarted({ appName = 'Lacuna' }) {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '80px 28px 40px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      fontFamily: RGF.sans, position: 'relative', overflow: 'hidden',
    }}>
      {/* ambient floating color blobs behind */}
      <div style={{ position: 'absolute', top: 140, right: -40, width: 180, height: 180, borderRadius: 90, background: RGF.butter, opacity: 0.55, filter: 'blur(2px)' }}/>
      <div style={{ position: 'absolute', top: 420, left: -60, width: 220, height: 220, borderRadius: 110, background: RGF.sky, opacity: 0.5, filter: 'blur(2px)' }}/>
      <div style={{ position: 'absolute', top: 320, right: 40, width: 120, height: 120, borderRadius: 60, background: RGF.lavender, opacity: 0.6, filter: 'blur(2px)' }}/>

      <div style={{ marginBottom: 40, position: 'relative', zIndex: 2 }}>
        <Logo size={56}/>
      </div>

      <div style={{
        fontFamily: RGF.display, fontSize: 52, lineHeight: 0.98,
        letterSpacing: -1.8, color: RGF.ink, marginBottom: 18, fontWeight: 400,
        position: 'relative', zIndex: 2,
      }}>
        Find the<br/><em style={{ fontStyle: 'italic' }}>space</em> where<br/>you matter.
      </div>
      <div style={{ fontSize: 16, color: RGF.inkSoft, lineHeight: 1.45, marginBottom: 40, position: 'relative', zIndex: 2 }}>
        {appName} turns <em>5,000</em> medical<br/>papers into one unanswered<br/>question — yours.
      </div>

      <div style={{ flex: 1 }}/>

      {/* Single centered CTA */}
      <div style={{ background: RGF.ink, color: '#fff', borderRadius: 28, padding: '22px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, fontWeight: 600, letterSpacing: -0.2, position: 'relative', zIndex: 2,
      }}>
        Get started
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: RGF.muted, marginTop: 16, position: 'relative', zIndex: 2 }}>
        Already have an account? <span style={{ color: RGF.ink, fontWeight: 500, textDecoration: 'underline' }}>Sign in</span>
      </div>
    </div>
  );
}

// Onboarding scaffold — a dot pager, skip, and close
function OnboardShell({ step, total = 4, children, ctaLabel = 'Next', ctaArrow = true, skip = true }) {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 28px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 6, height: 6, borderRadius: 3,
              background: i <= step ? RGF.ink : 'rgba(14,14,12,0.15)',
              transition: 'all .3s',
            }}/>
          ))}
        </div>
        {skip && <div style={{ fontSize: 13, color: RGF.muted }}>Skip</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>

      <div style={{ background: RGF.ink, color: '#fff', borderRadius: 28, padding: '18px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 16,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{ctaLabel}</div>
        {ctaArrow && (
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={16} color={RGF.ink}/>
          </div>
        )}
      </div>
    </div>
  );
}

// 1/4 — Pick a topic (gamified — user 'taps' a card)
function ScreenOnboardA() {
  const suggestions = [
    { t: 'GLP-1 in pediatric obesity', c: RGF.sky, selected: true },
    { t: 'CAR-T in solid tumors', c: RGF.mint },
    { t: 'Microbiome & colorectal ca.', c: RGF.butter },
    { t: 'ML for sepsis triage', c: RGF.peach },
  ];
  return (
    <OnboardShell step={0} ctaLabel="Use this topic">
      <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
        Step 1 of 4 · Choose a topic
      </div>
      <div style={{ fontFamily: RGF.display, fontSize: 36, lineHeight: 1.02, letterSpacing: -1, color: RGF.ink, marginBottom: 20, fontWeight: 400 }}>
        Start with what you <em>care about.</em>
      </div>
      <div style={{ fontSize: 14, color: RGF.inkSoft, lineHeight: 1.5, marginBottom: 24 }}>
        Pick a seed topic. We'll pull every paper in the last 5 years and hunt for what's missing.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{
            background: s.selected ? s.c : '#fff',
            borderRadius: 20, padding: 16,
            border: s.selected ? `2px solid ${RGF.ink}` : `1px solid ${RGF.hair}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: s.selected ? '#fff' : s.c,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="gap" size={16} color={RGF.ink}/>
            </div>
            <div style={{ flex: 1, fontSize: 14, color: RGF.ink, fontWeight: 500 }}>{s.t}</div>
            {s.selected && (
              <div style={{ width: 22, height: 22, borderRadius: 11, background: RGF.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={12} color="#fff" stroke={2.4}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </OnboardShell>
  );
}

// 2/4 — Narrow down / set filters (one-screen explain of PICO)
function ScreenOnboardB() {
  return (
    <OnboardShell step={1} ctaLabel="Run analysis">
      <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
        Step 2 of 4 · Frame the question
      </div>
      <div style={{ fontFamily: RGF.display, fontSize: 36, lineHeight: 1.02, letterSpacing: -1, color: RGF.ink, marginBottom: 20, fontWeight: 400 }}>
        Tell us the <em>PICO.</em>
      </div>
      <div style={{ fontSize: 14, color: RGF.inkSoft, lineHeight: 1.5, marginBottom: 20 }}>
        Population, Intervention, Comparator, Outcome. It's okay to leave some blank.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <PicoRow letter="P" label="Population" value="Children 6–17 with BMI ≥ 95th percentile" color={RGF.rose}/>
        <PicoRow letter="I" label="Intervention" value="Semaglutide 2.4mg weekly" color={RGF.lavender}/>
        <PicoRow letter="C" label="Comparator" value="Lifestyle only" color={RGF.mint}/>
        <PicoRow letter="O" label="Outcome" value="Cardiometabolic events at 24 mo" color={RGF.sky}/>
      </div>

      <div style={{ background: '#fff', borderRadius: 18, padding: '12px 14px',
        border: `1px solid ${RGF.hair}`, display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <Icon name="sparkle" size={16} color={RGF.ink}/>
        <div style={{ fontSize: 12, color: RGF.inkSoft, flex: 1 }}>We auto-filled this from your topic. Tap to edit.</div>
      </div>
    </OnboardShell>
  );
}

function PicoRow({ letter, label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 18, padding: 12,
      border: `1px solid ${RGF.hair}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: RGF.display, fontSize: 20, color: RGF.ink, fontWeight: 400,
      }}>{letter}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: RGF.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, color: RGF.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
      <Icon name="chevR" size={14} color={RGF.muted}/>
    </div>
  );
}

// 3/4 — Live analysis in progress
function ScreenOnboardC() {
  return (
    <OnboardShell step={2} ctaLabel="Analyzing..." ctaArrow={false}>
      <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
        Step 3 of 4 · Synthesis in progress
      </div>
      <div style={{ fontFamily: RGF.display, fontSize: 36, lineHeight: 1.02, letterSpacing: -1, color: RGF.ink, marginBottom: 20, fontWeight: 400 }}>
        Reading everything <em>so you don't have to.</em>
      </div>

      <div style={{
        background: '#fff', borderRadius: 24, padding: 18,
        border: `1px solid ${RGF.hair}`, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24,
            border: `3px solid ${RGF.hair}`, borderTopColor: RGF.ink,
            animation: 'spin 1s linear infinite',
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: RGF.ink }}>Clustering sub-topics</div>
            <div style={{ fontSize: 11, color: RGF.muted }}>187 of 512 papers processed</div>
          </div>
          <div style={{ fontFamily: RGF.display, fontSize: 28, color: RGF.ink, letterSpacing: -0.5 }}>37%</div>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: RGF.bg, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '37%', background: RGF.ink, borderRadius: 2 }}/>
        </div>
      </div>

      {/* live log */}
      <div style={{
        background: RGF.ink, color: '#fff', borderRadius: 22, padding: '14px 16px',
        fontFamily: RGF.mono, fontSize: 11, lineHeight: 1.7, flex: 1, overflow: 'hidden',
      }}>
        <div style={{ color: '#9FA8B8' }}>&gt; Fetching PubMed + Cochrane…</div>
        <div style={{ color: '#9FA8B8' }}>&gt; Retrieved <span style={{ color: RGF.butter }}>512</span> abstracts</div>
        <div style={{ color: '#9FA8B8' }}>&gt; Parsing full texts…</div>
        <div style={{ color: '#9FA8B8' }}>&gt; <span style={{ color: RGF.mint }}>187/512</span> parsed</div>
        <div style={{ color: '#9FA8B8' }}>&gt; Building embedding graph…</div>
        <div style={{ color: '#fff' }}>&gt; Clustering <span style={{ color: RGF.sky }}>sub-topics</span><span style={{ animation: 'blink 1s infinite' }}>▌</span></div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg);} } @keyframes blink { 50% { opacity: 0; }}`}</style>
    </OnboardShell>
  );
}

// 4/4 — The teaser reveal (paywalled)
function ScreenOnboardReveal() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 28px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ width: i === 3 ? 22 : 6, height: 6, borderRadius: 3,
              background: i <= 3 ? RGF.ink : 'rgba(14,14,12,0.15)' }}/>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
        Analysis complete · 8 gaps found
      </div>
      <div style={{ fontFamily: RGF.display, fontSize: 32, lineHeight: 1.02, letterSpacing: -0.9, color: RGF.ink, marginBottom: 16, fontWeight: 400 }}>
        You found a gap <em>nobody else has claimed.</em>
      </div>

      {/* Gap 1 — full, teaser */}
      <TeaserGap
        rank={1}
        color={RGF.sky}
        category="future-work"
        novelty={9}
        visibleTitle="Long-term cardiometabolic"
        hiddenTitle="safety under age 12"
      />

      {/* Gaps 2–8 — blurred stack */}
      <div style={{ flex: 1, position: 'relative', marginTop: 12, minHeight: 0 }}>
        <BlurredStack/>

        {/* Sign-up gate */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(241,238,232,0) 0%, rgba(241,238,232,0.7) 35%, rgba(241,238,232,1) 70%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '16px 4px',
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 18,
            border: `1px solid ${RGF.hair}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
              🔒 7 more gaps waiting
            </div>
            <div style={{ fontFamily: RGF.display, fontSize: 22, lineHeight: 1.1, letterSpacing: -0.4, color: RGF.ink, fontWeight: 400, marginBottom: 14 }}>
              Sign up free to see full titles, novelty scores and evidence quotes.
            </div>
            <div style={{ background: RGF.ink, color: '#fff', borderRadius: 18, padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Sign up to reveal</div>
              <Icon name="arrow" size={16} color="#fff"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeaserGap({ rank, color, category, novelty, visibleTitle, hiddenTitle }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 24, padding: 18,
      border: `1px solid ${RGF.hair}`, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: RGF.display, fontSize: 20, color: RGF.ink,
        }}>1</div>
        <div style={{ flex: 1 }}>
          <CategoryPill kind={category}/>
          <div style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 1.15, letterSpacing: -0.4, color: RGF.ink, marginTop: 8, fontWeight: 400 }}>
            {visibleTitle}{' '}
            <span style={{
              background: 'rgba(14,14,12,0.95)', color: 'rgba(14,14,12,0.95)',
              borderRadius: 6, padding: '0 8px', userSelect: 'none',
              filter: 'blur(4px)',
            }}>{hiddenTitle}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 8, borderTop: `1px solid ${RGF.hair}` }}>
        <ScoreDial value={novelty} label="Novelty" color={RGF.ink}/>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, opacity: 0.4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, border: `2px dashed ${RGF.hair}` }}/>
          <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 0.3, textTransform: 'uppercase' }}>Feasibility<br/>locked</div>
        </div>
      </div>
    </div>
  );
}

function BlurredStack() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, filter: 'blur(4px)', opacity: 0.7, pointerEvents: 'none' }}>
      {[RGF.mint, RGF.butter, RGF.lavender].map((c, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 22, padding: 16, border: `1px solid ${RGF.hair}`, display: 'flex', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: c }}/>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, background: RGF.hair, borderRadius: 4, marginBottom: 8, width: '40%' }}/>
            <div style={{ height: 14, background: RGF.hair, borderRadius: 4, marginBottom: 6, width: '85%' }}/>
            <div style={{ height: 14, background: RGF.hair, borderRadius: 4, width: '60%' }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// Sign up screen — Google / Apple / Email
function ScreenSignUp() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 28px 32px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <ChipIcon name="chevR" size={40} iconSize={14}/>
        <Logo size={36}/>
      </div>

      <div style={{ fontFamily: RGF.display, fontSize: 44, lineHeight: 0.98, letterSpacing: -1.4, color: RGF.ink, marginBottom: 14, fontWeight: 400 }}>
        Create your<br/><em>account.</em>
      </div>
      <div style={{ fontSize: 15, color: RGF.inkSoft, lineHeight: 1.45, marginBottom: 36 }}>
        Save this gap and explore 7 more.<br/>Free forever, 3 analyses a month.
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SocialBtn provider="google"/>
        <SocialBtn provider="apple"/>
        <SocialBtn provider="email"/>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: RGF.muted, marginTop: 28, lineHeight: 1.5 }}>
        By continuing you agree to our<br/>
        <span style={{ color: RGF.inkSoft, textDecoration: 'underline' }}>Terms</span>
        {' · '}
        <span style={{ color: RGF.inkSoft, textDecoration: 'underline' }}>Privacy</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: RGF.muted, marginTop: 16 }}>
        Already have an account? <span style={{ color: RGF.ink, fontWeight: 500, textDecoration: 'underline' }}>Sign in</span>
      </div>
    </div>
  );
}

function SocialBtn({ provider }) {
  const config = {
    google: { bg: '#fff', color: RGF.ink, border: `1px solid ${RGF.hair}`, label: 'Continue with Google' },
    apple:  { bg: RGF.ink, color: '#fff', border: 'none', label: 'Continue with Apple' },
    email:  { bg: 'transparent', color: RGF.ink, border: `1px solid ${RGF.ink}`, label: 'Continue with email' },
  }[provider];

  const icons = {
    google: (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
      </svg>
    ),
    apple: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M17.05 12.04c-.03-3.16 2.58-4.68 2.7-4.75-1.47-2.15-3.76-2.44-4.57-2.48-1.95-.2-3.8 1.15-4.79 1.15-.99 0-2.51-1.12-4.13-1.09-2.12.03-4.09 1.23-5.19 3.13-2.21 3.84-.56 9.52 1.6 12.63 1.05 1.52 2.3 3.22 3.94 3.16 1.58-.06 2.18-1.02 4.08-1.02 1.9 0 2.44 1.02 4.11.99 1.7-.03 2.77-1.54 3.81-3.07 1.2-1.76 1.69-3.47 1.72-3.56-.04-.02-3.29-1.26-3.32-5.01zM13.98 3.3C14.85 2.24 15.43.78 15.27-.67c-1.24.05-2.73.82-3.63 1.87-.8.93-1.51 2.41-1.32 3.83 1.38.11 2.79-.7 3.66-1.73z"/>
      </svg>
    ),
    email: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RGF.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2"/>
        <path d="M3 7l9 6 9-6"/>
      </svg>
    ),
  };

  return (
    <div style={{
      background: config.bg, color: config.color, border: config.border,
      borderRadius: 22, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 15, fontWeight: 500, letterSpacing: -0.2,
      justifyContent: 'center', position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }}>{icons[provider]}</div>
      {config.label}
    </div>
  );
}

// Sign-in / Login
function ScreenSignIn() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 28px 32px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <ChipIcon name="chevR" size={40} iconSize={14}/>
        <Logo size={36}/>
      </div>

      <div style={{ fontFamily: RGF.display, fontSize: 44, lineHeight: 0.98, letterSpacing: -1.4, color: RGF.ink, marginBottom: 14, fontWeight: 400 }}>
        Welcome<br/><em>back.</em>
      </div>
      <div style={{ fontSize: 15, color: RGF.inkSoft, lineHeight: 1.45, marginBottom: 32 }}>
        Pick up where you left off.
      </div>

      {/* email / password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '14px 18px',
          border: `1px solid ${RGF.hair}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="note" size={18} color={RGF.muted}/>
          <div style={{ fontSize: 15, color: RGF.ink }}>seif@researcher.edu</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 18, padding: '14px 18px',
          border: `1px solid ${RGF.hair}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="link" size={18} color={RGF.muted}/>
          <div style={{ fontSize: 15, color: RGF.ink, letterSpacing: 3 }}>••••••••</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 12, color: RGF.muted }}>Show</div>
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: 13, color: RGF.inkSoft, fontWeight: 500, marginBottom: 22 }}>
        Forgot password?
      </div>

      <div style={{ background: RGF.ink, color: '#fff', borderRadius: 22, padding: '16px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
        fontSize: 15, fontWeight: 600 }}>
        Sign in
      </div>

      {/* divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, height: 1, background: RGF.hair }}/>
        <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>or</div>
        <div style={{ flex: 1, height: 1, background: RGF.hair }}/>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: 14,
          border: `1px solid ${RGF.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          <div style={{ fontSize: 13, color: RGF.ink, fontWeight: 500 }}>Google</div>
        </div>
        <div style={{ flex: 1, background: RGF.ink, color: '#fff', borderRadius: 18, padding: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.05 12.04c-.03-3.16 2.58-4.68 2.7-4.75-1.47-2.15-3.76-2.44-4.57-2.48-1.95-.2-3.8 1.15-4.79 1.15-.99 0-2.51-1.12-4.13-1.09-2.12.03-4.09 1.23-5.19 3.13-2.21 3.84-.56 9.52 1.6 12.63 1.05 1.52 2.3 3.22 3.94 3.16 1.58-.06 2.18-1.02 4.08-1.02 1.9 0 2.44 1.02 4.11.99 1.7-.03 2.77-1.54 3.81-3.07 1.2-1.76 1.69-3.47 1.72-3.56-.04-.02-3.29-1.26-3.32-5.01zM13.98 3.3C14.85 2.24 15.43.78 15.27-.67c-1.24.05-2.73.82-3.63 1.87-.8.93-1.51 2.41-1.32 3.83 1.38.11 2.79-.7 3.66-1.73z"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Apple</div>
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <div style={{ textAlign: 'center', fontSize: 13, color: RGF.muted, marginTop: 16 }}>
        New here? <span style={{ color: RGF.ink, fontWeight: 500, textDecoration: 'underline' }}>Create an account</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenGetStarted, ScreenOnboardA, ScreenOnboardB, ScreenOnboardC,
  ScreenOnboardReveal, ScreenSignUp, ScreenSignIn,
});
