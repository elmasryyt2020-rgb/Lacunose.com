// Screen 3: Streaming results (the hero screen)

function ScreenResults() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 120px', boxSizing: 'border-box',
      overflow: 'auto', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <ChipIcon name="chevR" size={40} iconSize={14} />
        <div style={{ display: 'flex', gap: 8 }}>
          <ChipIcon name="share" size={40} iconSize={16}/>
          <ChipIcon name="download" size={40} iconSize={16}/>
        </div>
      </div>

      {/* topic heading */}
      <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
        Analysis · Pediatrics
      </div>
      <div style={{
        fontFamily: RGF.display, fontSize: 32, lineHeight: 1.05,
        letterSpacing: -0.9, color: RGF.ink, marginBottom: 18,
        fontWeight: 400,
      }}>
        GLP-1 agonists for<br/>pediatric <em style={{ fontStyle: 'italic' }}>obesity</em>
      </div>

      {/* streaming progress */}
      <StreamStatus />

      {/* gap cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <GapCard
          rank={1}
          color={RGF.sky}
          category="future-work"
          novelty={9}
          feas={7}
          title="Long-term cardiometabolic safety under age 12"
          desc="No RCTs track outcomes beyond 18 months in children <12. Five trials explicitly flag this as the critical unknown."
          evidence={[
            { quote: '…future studies should examine outcomes beyond 2 years in pre-adolescent populations…', year: 2024, authors: 'Nelson et al.' },
            { quote: '…long-term cardiovascular safety data in children under 12 remain unavailable…', year: 2025, authors: 'Park, Rivera, Kaur' },
          ]}
        />
        <GapCard
          rank={2}
          color={RGF.lavender}
          category="pico"
          novelty={8}
          feas={9}
          title="Dose-response in adolescents with Down syndrome"
          desc="PICO analysis surfaces zero studies where population = trisomy-21 and intervention = semaglutide; 47 studies in adjacent populations."
          collapsed
        />
        <GapCard
          rank={3}
          color={RGF.butter}
          category="llm"
          novelty={7}
          feas={8}
          title="Adherence behaviors in rural vs. urban teens"
          desc="Cross-cluster synthesis: adherence modelled only in urban US cohorts (N=14) vs. rural (N=0)."
          collapsed
        />
        <GapCardPending rank={4}/>
      </div>
    </div>
  );
}

function StreamStatus() {
  const steps = [
    { label: 'Fetched 512 papers', done: true },
    { label: 'Parsed 187 full texts', done: true },
    { label: 'Clustered into 6 sub-topics', done: true },
    { label: 'Synthesizing gaps…', active: true },
  ];
  return (
    <div style={{
      background: '#fff', borderRadius: 22, padding: '16px 18px',
      marginBottom: 20, border: `1px solid ${RGF.hair}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: RGF.ink }}>3 of 4 steps</div>
        <div style={{ fontSize: 12, color: RGF.muted }}>~20s remaining</div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: RGF.bg, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ height: '100%', width: '75%', background: RGF.ink, borderRadius: 2 }}/>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          {s.done ? (
            <div style={{ width: 16, height: 16, borderRadius: 8, background: RGF.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={10} color="#fff" stroke={2.4}/>
            </div>
          ) : s.active ? (
            <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${RGF.ink}`, borderTopColor: 'transparent' }}/>
          ) : (
            <div style={{ width: 16, height: 16, borderRadius: 8, border: `1.5px solid ${RGF.hair}` }}/>
          )}
          <div style={{ fontSize: 13, color: s.done ? RGF.muted : RGF.ink, fontWeight: s.active ? 500 : 400 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function GapCard({ rank, color, category, novelty, feas, title, desc, evidence = [], collapsed }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 26, padding: 18,
      border: `1px solid ${RGF.hair}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontFamily: RGF.display, fontSize: 20, color: RGF.ink,
        }}>
          {String(rank).padStart(2, '0').charAt(1)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CategoryPill kind={category}/>
          <div style={{
            fontFamily: RGF.display, fontSize: 20, lineHeight: 1.15,
            letterSpacing: -0.4, color: RGF.ink, marginTop: 8,
            fontWeight: 400,
          }}>{title}</div>
        </div>
      </div>

      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: RGF.inkSoft, marginBottom: 14 }}>
        {desc}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: collapsed ? 0 : 14 }}>
        <ScoreDial value={novelty} label="Novelty" color={RGF.ink}/>
        <ScoreDial value={feas} label="Feasibility" color={RGF.ink}/>
      </div>

      {!collapsed && evidence.length > 0 && (
        <div style={{ background: RGF.bg, borderRadius: 18, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Evidence · {evidence.length} papers</span>
            <span>Verified ✓</span>
          </div>
          {evidence.map((e, i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: i > 0 ? `1px solid ${RGF.hair}` : 'none' }}>
              <div style={{ fontFamily: RGF.display, fontSize: 14, lineHeight: 1.4, color: RGF.ink, fontStyle: 'italic', marginBottom: 4 }}>
                "{e.quote}"
              </div>
              <div style={{ fontSize: 11, color: RGF.muted }}>{e.authors} · {e.year}</div>
            </div>
          ))}
        </div>
      )}

      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
          <div style={{ fontSize: 12, color: RGF.muted }}>3 papers · verified</div>
          <Icon name="chevD" size={16} color={RGF.muted}/>
        </div>
      )}
    </div>
  );
}

function GapCardPending({ rank }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 26, padding: 18,
      border: `1px dashed ${RGF.hair}`,
      display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 14, background: RGF.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: RGF.display, fontSize: 20, color: RGF.muted }}>
        {rank}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: 10, borderRadius: 5, background: RGF.hair, marginBottom: 8, width: '70%' }}/>
        <div style={{ height: 8, borderRadius: 4, background: RGF.hair, width: '50%' }}/>
      </div>
      <div style={{ width: 14, height: 14, borderRadius: 7, border: `2px solid ${RGF.ink}`, borderTopColor: 'transparent' }}/>
    </div>
  );
}

Object.assign(window, { ScreenResults, GapCard });
