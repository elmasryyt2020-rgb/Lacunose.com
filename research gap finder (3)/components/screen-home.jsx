// Screen 1: Home / Dashboard

function ScreenHome() {
  const recent = [
    { topic: 'GLP-1 agonists in pediatric obesity', count: 8, time: '2h ago', color: RGF.sky },
    { topic: 'CAR-T cell therapy in solid tumors', count: 12, time: 'Yesterday', color: RGF.mint },
    { topic: 'Microbiome & colorectal cancer', count: 6, time: '3d ago', color: RGF.butter },
  ];

  return (
    <div style={{
      height: '100%', background: RGF.bg,
      padding: '60px 22px 120px', boxSizing: 'border-box',
      overflow: 'auto', fontFamily: RGF.sans,
    }}>
      {/* top row: question mark + bell */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <ChipIcon name="book" size={40} iconSize={18} />
        <div style={{ position: 'relative' }}>
          <ChipIcon name="bell" size={40} iconSize={18} />
          <div style={{
            position: 'absolute', top: -2, right: -2, background: '#E55B3C',
            color: '#fff', width: 18, height: 18, borderRadius: 9,
            fontSize: 10, fontWeight: 600, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>3</div>
        </div>
      </div>

      {/* hero headline */}
      <div style={{
        fontFamily: RGF.display, fontSize: 40, lineHeight: 1.02,
        letterSpacing: -1.2, color: RGF.ink, marginBottom: 4,
        fontWeight: 400,
      }}>
        Hi Seif,
      </div>
      <div style={{
        fontFamily: RGF.display, fontSize: 40, lineHeight: 1.02,
        letterSpacing: -1.2, color: RGF.ink, marginBottom: 28,
        fontWeight: 400,
      }}>
        find your <em style={{ fontStyle: 'italic' }}>next</em><br/>research gap.
      </div>

      {/* quad of action cards — this is THE key hero component */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <ActionCard color={RGF.sky} title="New topic" subtitle="Free-text search" glyph="search" />
        <ActionCard color={RGF.lavender} title="Upload PDF" subtitle="Seed paper" glyph="upload" />
        <ActionCard color={RGF.mint} title="PICO" subtitle="Clinical frame" glyph="dna" />
        <ActionCard color={RGF.butter} title="Ask AI" subtitle="Chat a gap" glyph="sparkle" />
      </div>

      {/* recent analyses */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: RGF.display, fontSize: 22, color: RGF.ink, letterSpacing: -0.4 }}>
          Recent analyses
        </div>
        <div style={{ fontSize: 13, color: RGF.muted }}>See all</div>
      </div>

      {recent.map((r, i) => (
        <RecentRow key={i} {...r} />
      ))}

      {/* search / ask bar */}
      <div style={{
        position: 'absolute', bottom: 100, left: 22, right: 22,
        background: '#fff', borderRadius: 28, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        border: `1px solid ${RGF.hair}`,
        boxShadow: '0 6px 16px rgba(0,0,0,0.04)',
      }}>
        <Icon name="search" size={18} color={RGF.muted}/>
        <div style={{ flex: 1, fontSize: 14, color: RGF.muted }}>Ask or search for anything</div>
        <ChipIcon name="mic" size={32} iconSize={14} bg={RGF.bg} color={RGF.ink}/>
      </div>
    </div>
  );
}

function ActionCard({ color, title, subtitle, glyph }) {
  return (
    <div style={{
      background: color, borderRadius: 26, padding: 18,
      height: 128, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', position: 'relative',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={glyph} size={18} color={RGF.ink}/>
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: RGF.ink, letterSpacing: -0.3, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: RGF.inkSoft, opacity: 0.75 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function RecentRow({ topic, count, time, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 22, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
      border: `1px solid ${RGF.hair}`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name="gap" size={20} color={RGF.ink}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: RGF.ink, letterSpacing: -0.2, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</div>
        <div style={{ fontSize: 12, color: RGF.muted }}>{count} gaps · {time}</div>
      </div>
      <Icon name="chevR" size={16} color={RGF.muted}/>
    </div>
  );
}

Object.assign(window, { ScreenHome });
