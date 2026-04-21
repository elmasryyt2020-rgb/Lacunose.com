// Screen 4: Single gap detail / evidence drill-down
// Screen 5: Library of analyses
// Screen 6: Paywall / pricing
// Screen 7: Login

function ScreenDetail() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 120px', boxSizing: 'border-box',
      overflow: 'auto', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <ChipIcon name="chevR" size={40} iconSize={14} />
        <ChipIcon name="bookmark" size={40} iconSize={16} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <CategoryPill kind="future-work"/>
      </div>

      <div style={{
        fontFamily: RGF.display, fontSize: 30, lineHeight: 1.05,
        letterSpacing: -0.8, color: RGF.ink, marginBottom: 20,
        fontWeight: 400,
      }}>
        Long-term<br/>cardiometabolic<br/>safety in children<br/><em style={{ fontStyle: 'italic' }}>under twelve.</em>
      </div>

      {/* scores */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <ScoreBig value={9} label="Novelty" color={RGF.sky}/>
        <ScoreBig value={7} label="Feasibility" color={RGF.mint}/>
        <ScoreBig value={6} label="Evidence" color={RGF.butter}/>
      </div>

      {/* research question */}
      <div style={{
        background: RGF.ink, borderRadius: 24, padding: 20,
        color: '#fff', marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>
          Suggested research question
        </div>
        <div style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 1.3, letterSpacing: -0.3, fontWeight: 400 }}>
          In children aged 6–11 with BMI ≥ 95th percentile, does 24-month semaglutide use alter lipid profile or HRV compared to lifestyle-only?
        </div>
      </div>

      {/* method rec */}
      <div style={{ background: '#fff', borderRadius: 24, padding: 18, marginBottom: 14, border: `1px solid ${RGF.hair}` }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: RGF.muted, marginBottom: 8 }}>
          Suggested method
        </div>
        <div style={{ fontSize: 15, color: RGF.ink, lineHeight: 1.45, marginBottom: 10 }}>
          Multi-center <strong>prospective cohort</strong> with 24-month follow-up.
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: RGF.muted }}>
          <span>Est. N ≈ 180</span>
          <span>·</span>
          <span>3 sites</span>
          <span>·</span>
          <span>18–24 mo</span>
        </div>
      </div>

      {/* evidence panel */}
      <div style={{ background: '#fff', borderRadius: 24, padding: 18, border: `1px solid ${RGF.hair}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink, letterSpacing: -0.3 }}>Evidence</div>
          <div style={{ fontSize: 12, color: RGF.muted }}>5 papers</div>
        </div>
        {[
          { q: '…future studies should examine outcomes beyond 2 years in pre-adolescent populations, particularly cardiovascular endpoints…', a: 'Nelson, Chen, O\'Brien', y: 2024, j: 'NEJM', s: 'discussion' },
          { q: '…long-term cardiovascular safety data in children under 12 remain unavailable…', a: 'Park, Rivera, Kaur', y: 2025, j: 'Lancet Child Adol.', s: 'limitations' },
          { q: '…trials to date have not been powered to detect cardiometabolic events in this age group…', a: 'Otieno et al.', y: 2023, j: 'Pediatrics', s: 'limitations' },
        ].map((e, i) => (
          <div key={i} style={{
            paddingTop: 12, paddingBottom: 12,
            borderTop: i > 0 ? `1px solid ${RGF.hair}` : 'none',
          }}>
            <div style={{
              fontFamily: RGF.display, fontSize: 15, lineHeight: 1.4,
              color: RGF.ink, fontStyle: 'italic', marginBottom: 8,
            }}>
              "{e.q}"
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: RGF.muted }}>{e.a} · <em>{e.j}</em> · {e.y}</div>
              <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: RGF.bg, color: RGF.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>{e.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBig({ value, label, color }) {
  return (
    <div style={{
      flex: 1, background: color, borderRadius: 20,
      padding: '14px 12px', aspectRatio: '1 / 1.05',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 10, color: RGF.inkSoft, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: RGF.display, fontSize: 48, lineHeight: 1, color: RGF.ink, letterSpacing: -1.5 }}>
        {value}<span style={{ fontSize: 18, color: RGF.muted }}>/10</span>
      </div>
    </div>
  );
}

function ScreenLibrary() {
  const items = [
    { topic: 'GLP-1 agonists in pediatric obesity', field: 'Pediatrics', gaps: 8, date: 'Today', color: RGF.sky },
    { topic: 'CAR-T cell therapy in solid tumors', field: 'Oncology', gaps: 12, date: 'Yesterday', color: RGF.mint },
    { topic: 'Microbiome & colorectal cancer', field: 'Oncology', gaps: 6, date: 'Apr 12', color: RGF.butter },
    { topic: 'Alzheimer\'s biomarkers in plasma', field: 'Neurology', gaps: 9, date: 'Apr 09', color: RGF.lavender },
    { topic: 'Sepsis early warning ML', field: 'ICU', gaps: 11, date: 'Apr 02', color: RGF.peach },
    { topic: 'Community HPV screening', field: 'Public health', gaps: 5, date: 'Mar 28', color: RGF.rose },
  ];

  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 120px', boxSizing: 'border-box',
      overflow: 'auto', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <ChipIcon name="filter" size={40} iconSize={16}/>
        <ChipIcon name="search" size={40} iconSize={16}/>
      </div>
      <div style={{
        fontFamily: RGF.display, fontSize: 40, lineHeight: 1.02,
        letterSpacing: -1.2, color: RGF.ink, marginBottom: 6, fontWeight: 400,
      }}>
        Library
      </div>
      <div style={{ fontSize: 13, color: RGF.muted, marginBottom: 24 }}>
        {items.length} analyses · 51 saved gaps
      </div>

      {/* filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {['All', 'Pediatrics', 'Oncology', 'Neurology', 'ICU'].map((f, i) => (
          <div key={f} style={{
            padding: '8px 14px', borderRadius: 99,
            background: i === 0 ? RGF.ink : '#fff',
            color: i === 0 ? '#fff' : RGF.ink,
            border: i === 0 ? 'none' : `1px solid ${RGF.hair}`,
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
          }}>{f}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 22, padding: 14,
            border: `1px solid ${RGF.hair}`,
            display: 'flex', flexDirection: 'column', gap: 10,
            minHeight: 160,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, background: it.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="gap" size={16} color={RGF.ink}/>
            </div>
            <div style={{
              flex: 1, fontFamily: RGF.display, fontSize: 16, lineHeight: 1.2,
              letterSpacing: -0.3, color: RGF.ink, fontWeight: 400,
            }}>{it.topic}</div>
            <div>
              <div style={{ fontSize: 10, color: RGF.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>{it.field}</div>
              <div style={{ fontSize: 12, color: RGF.inkSoft, fontWeight: 500 }}>{it.gaps} gaps · {it.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenPaywall() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 40px', boxSizing: 'border-box',
      overflow: 'auto', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <ChipIcon name="close" size={40} iconSize={16}/>
        <div style={{ fontSize: 13, color: RGF.muted }}>Restore</div>
      </div>
      <div style={{
        fontFamily: RGF.display, fontSize: 38, lineHeight: 1.02,
        letterSpacing: -1.2, color: RGF.ink, marginBottom: 6, fontWeight: 400,
      }}>
        Go <em style={{ fontStyle: 'italic' }}>deeper.</em>
      </div>
      <div style={{ fontSize: 14, color: RGF.inkSoft, lineHeight: 1.4, marginBottom: 24 }}>
        Unlimited analyses, full gap lists,<br/>Zotero sync, advisor mode.
      </div>

      {/* tier cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <TierCard tier="Free" price="$0" desc="3 analyses/month · top-5 gaps" current />
        <TierCard tier="Pro" price="$20" period="/ month" desc="20 analyses · full list · Zotero · advisor" featured />
        <TierCard tier="Team" price="From $5k" period="/ year" desc="API access · SSO · university dashboard" dark/>
      </div>

      <div style={{ background: RGF.ink, color: '#fff', borderRadius: 28, padding: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Start 7-day trial</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>$20/mo after · cancel anytime</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 21, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow" size={18} color={RGF.ink}/>
        </div>
      </div>
    </div>
  );
}

function TierCard({ tier, price, period, desc, featured, current, dark }) {
  const bg = featured ? RGF.butter : dark ? RGF.ink : '#fff';
  const ink = dark ? '#fff' : RGF.ink;
  const soft = dark ? 'rgba(255,255,255,0.6)' : RGF.inkSoft;
  return (
    <div style={{
      background: bg, borderRadius: 24, padding: 18,
      border: featured || dark ? 'none' : `1px solid ${RGF.hair}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontFamily: RGF.display, fontSize: 22, color: ink, letterSpacing: -0.4 }}>{tier}</div>
        {current && (
          <div style={{ padding: '4px 10px', borderRadius: 99, background: RGF.ink, color: '#fff', fontSize: 11, fontWeight: 500 }}>Current</div>
        )}
        {featured && (
          <div style={{ padding: '4px 10px', borderRadius: 99, background: RGF.ink, color: '#fff', fontSize: 11, fontWeight: 500 }}>Most popular</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <div style={{ fontFamily: RGF.display, fontSize: 32, color: ink, letterSpacing: -1 }}>{price}</div>
        {period && <div style={{ fontSize: 13, color: soft }}>{period}</div>}
      </div>
      <div style={{ fontSize: 13, color: soft, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function ScreenLogin() {
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '80px 28px 40px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      fontFamily: RGF.sans,
    }}>
      {/* logo mark */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, background: RGF.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{ width: 22, height: 2, background: '#fff', borderRadius: 1, marginRight: 14 }}/>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: RGF.butter, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}/>
          <div style={{ width: 22, height: 2, background: '#fff', borderRadius: 1, marginLeft: 14 }}/>
        </div>
      </div>

      <div style={{
        fontFamily: RGF.display, fontSize: 48, lineHeight: 0.98,
        letterSpacing: -1.6, color: RGF.ink, marginBottom: 16, fontWeight: 400,
      }}>
        Find the<br/><em style={{ fontStyle: 'italic' }}>space</em> where<br/>you matter.
      </div>
      <div style={{ fontSize: 15, color: RGF.inkSoft, lineHeight: 1.45, marginBottom: 40 }}>
        Literature gap-finder for<br/>medical researchers.
      </div>

      <div style={{ flex: 1 }}/>

      {/* email input */}
      <div style={{
        background: '#fff', borderRadius: 22, padding: '16px 18px',
        marginBottom: 10, border: `1px solid ${RGF.hair}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon name="note" size={18} color={RGF.muted}/>
        <div style={{ fontSize: 15, color: RGF.ink }}>seif@researcher.edu</div>
      </div>

      <div style={{ background: RGF.ink, color: '#fff', borderRadius: 22, padding: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Send magic link</div>
        <Icon name="arrow" size={18} color="#fff"/>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: RGF.muted, marginTop: 18 }}>
        or <span style={{ color: RGF.ink, fontWeight: 500, textDecoration: 'underline' }}>continue with Google</span>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDetail, ScreenLibrary, ScreenPaywall, ScreenLogin });
