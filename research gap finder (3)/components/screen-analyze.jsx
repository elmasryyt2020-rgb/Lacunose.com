// Screen 2: Analyze / topic input

function ScreenAnalyze() {
  const subfields = ['Cardiology', 'Oncology', 'Neurology', 'ID', 'Surgery', 'Pediatrics'];
  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 120px', boxSizing: 'border-box',
      overflow: 'auto', fontFamily: RGF.sans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <ChipIcon name="close" size={40} iconSize={16} />
        <div style={{ fontSize: 13, color: RGF.muted }}>2 of 3 used this month</div>
      </div>

      <div style={{
        fontFamily: RGF.display, fontSize: 42, lineHeight: 1.02,
        letterSpacing: -1.3, color: RGF.ink, marginBottom: 32,
        fontWeight: 400,
      }}>
        What area of<br/>medicine do you<br/>want to <em style={{ fontStyle: 'italic' }}>explore?</em>
      </div>

      {/* topic box */}
      <div style={{
        background: '#fff', borderRadius: 26, padding: 20,
        minHeight: 150, marginBottom: 20,
        border: `1px solid ${RGF.hair}`,
      }}>
        <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Topic
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.35, color: RGF.ink, letterSpacing: -0.3, fontWeight: 400, minHeight: 54 }}>
          GLP-1 agonists for pediatric obesity
          <span style={{ display: 'inline-block', width: 2, height: 22, background: RGF.ink, marginLeft: 2, verticalAlign: 'text-bottom', animation: 'none' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <ChipIcon name="paperclip" size={32} iconSize={14} bg={RGF.bg}/>
            <ChipIcon name="mic" size={32} iconSize={14} bg={RGF.bg}/>
          </div>
          <div style={{ fontSize: 12, color: RGF.muted }}>32 / 240</div>
        </div>
      </div>

      {/* subfield chips */}
      <div style={{ fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
        Sub-field
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {subfields.map((s, i) => (
          <div key={s} style={{
            padding: '10px 16px', borderRadius: 999,
            background: i === 4 ? RGF.ink : '#fff',
            color: i === 4 ? '#fff' : RGF.ink,
            border: i === 4 ? 'none' : `1px solid ${RGF.hair}`,
            fontSize: 14, fontWeight: 500, letterSpacing: -0.2,
          }}>{s}</div>
        ))}
      </div>

      {/* filter toggles */}
      <div style={{
        background: '#fff', borderRadius: 24, padding: '6px 0',
        border: `1px solid ${RGF.hair}`, marginBottom: 24,
      }}>
        <FilterRow label="Include preprints" value="On"/>
        <FilterRow label="Open-access only" value="Off" muted/>
        <FilterRow label="Years" value="2019–2026"/>
        <FilterRow label="Study designs" value="All" last/>
      </div>

      {/* CTA */}
      <div style={{
        background: RGF.ink, color: '#fff', borderRadius: 28,
        padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Find gaps</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>≈ 45 sec · 500 papers</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 22, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="arrow" size={20} color={RGF.ink}/>
        </div>
      </div>
    </div>
  );
}

function FilterRow({ label, value, muted, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 18px',
      borderBottom: last ? 'none' : `1px solid ${RGF.hair}`,
    }}>
      <div style={{ fontSize: 14, color: RGF.ink, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 13, color: muted ? RGF.muted : RGF.ink }}>{value}</div>
        <Icon name="chevR" size={14} color={RGF.muted}/>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenAnalyze });
