'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

function SvgIcon({ name, size = 24, color = 'var(--ink)', stroke = 1.6 }: { name: string; size?: number; color?: string; stroke?: number }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let paths: React.ReactNode = null;
  switch (name) {
    case 'arrow': paths = <path d="M5 12h14M13 6l6 6-6 6" {...p} />; break;
    case 'check': paths = <path d="M5 13l4 4L19 7" {...p} />; break;
    case 'book': paths = <><path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" {...p} /><path d="M5 4v13a3 3 0 003 3" {...p} /></>; break;
    case 'bolt': paths = <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" {...p} />; break;
    case 'target': paths = <><circle cx="12" cy="12" r="8" {...p} /><circle cx="12" cy="12" r="4" {...p} /><circle cx="12" cy="12" r="1" {...p} /></>; break;
    case 'quote': paths = <path d="M7 8h3v4a3 3 0 01-3 3M14 8h3v4a3 3 0 01-3 3" {...p} />; break;
    case 'layers': paths = <><path d="M12 3l9 5-9 5-9-5 9-5z" {...p} /><path d="M3 13l9 5 9-5" {...p} /><path d="M3 17l9 5 9-5" {...p} /></>; break;
    case 'globe': paths = <><circle cx="12" cy="12" r="8" {...p} /><path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16" {...p} /></>; break;
    case 'sparkle': paths = <path d="M12 4l1.8 4.7L18 10l-4.2 1.3L12 16l-1.8-4.7L6 10l4.2-1.3L12 4z" {...p} />; break;
    case 'gap': paths = <><path d="M4 12h5M15 12h5" {...p} /><circle cx="12" cy="12" r="3" {...p} /></>; break;
    default: paths = <circle cx="12" cy="12" r="8" {...p} />;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{paths}</svg>;
}

function ScoreDial({ value = 7, max = 10, label = 'Novelty', size = 44 }: { value?: number; max?: number; label?: string; size?: number }) {
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  const pct = value / max;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--hair)" strokeWidth="3" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ink)" strokeWidth="3" fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
          fontFamily="var(--sans)" fontWeight="600" fontSize="13" fill="var(--ink)">{value}</text>
      </svg>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase' as const }}>{label}</span>
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage("You're on the list! We'll be in touch soon.");
        setEmail('');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to connect to the server.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient blobs — same as mobile home screen */}
      <div className="blob" style={{ top: 80, right: -40, width: 260, height: 260, background: 'var(--butter)' }} />
      <div className="blob" style={{ top: 400, left: -80, width: 320, height: 320, background: 'var(--sky)' }} />
      <div className="blob" style={{ top: 220, right: 80, width: 180, height: 180, background: 'var(--lavender)' }} />
      <div className="blob" style={{ bottom: 200, left: '30%', width: 240, height: 240, background: 'var(--mint)' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 22px', position: 'relative', zIndex: 1 }}>

        {/* ── Nav ── */}
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image src="/logo.png" alt="Lacunose" width={36} height={36} style={{ borderRadius: 10 }} />
            <span className="display" style={{ fontSize: 20, fontWeight: 400, letterSpacing: -0.5 }}>Lacunose</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/privacy" className="hide-mobile" style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Privacy</Link>
            <Link href="/terms" className="hide-mobile" style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Terms</Link>
            <a href="#waitlist" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'inline-block', lineHeight: '20px' }}>Join Waitlist</a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 60px' }}>
          {/* pill badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--hair)', fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
            Coming soon for iOS &amp; Android
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.05, letterSpacing: -1.4, marginBottom: 16 }}>
            Explore your <em>next</em><br />research space.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 40px' }}>
            Lacunose reads 1,500 abstracts and surfaces novel research gaps backed by verbatim evidence — so you can focus on <strong style={{ color: 'var(--ink)' }}>the question nobody else has asked.</strong>
          </p>
        </section>

        {/* ── Toast notification ── */}
        {showToast && (
          <div style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--bg)', padding: '14px 24px',
            borderRadius: 22, display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 100,
            animation: 'slideDown 0.3s ease-out',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SvgIcon name="check" size={14} color="var(--ink)" stroke={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>You&rsquo;re on the list!</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>We&rsquo;ll be in touch soon.</div>
            </div>
            <button onClick={() => setShowToast(false)} style={{ background: 'none', border: 'none', color: 'var(--bg)', cursor: 'pointer', opacity: 0.5, padding: 4, marginLeft: 8, fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* ── Waitlist card — centered ── */}
        <section id="waitlist" className="surface-card" style={{ maxWidth: 440, margin: '0 auto 100px', padding: 24 }}>
          <form onSubmit={handleSubmit}>
            <p style={{ fontWeight: 500, fontSize: 11, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 10 }}>Get early access</p>
            <input type="email" placeholder="Your academic email" className="input-field" value={email} onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }} disabled={status === 'loading'} required style={{ marginBottom: 12 }} />
            <button type="submit" className="btn-cta" disabled={status === 'loading'} style={{ opacity: status === 'loading' ? 0.6 : 1 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{status === 'loading' ? 'Joining…' : 'Join the waitlist'}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 3 }}>Free forever · 3 analyses / month</div>
              </div>
              <div className="arrow-circle"><SvgIcon name="arrow" size={18} color="var(--ink)" /></div>
            </button>
            {status === 'error' && <p style={{ color: '#c44', fontSize: 13, marginTop: 10 }}>{message}</p>}
          </form>
        </section>

        {/* ── How it works ── */}
        <section style={{ maxWidth: 640, margin: '0 auto 100px' }}>
          <p style={{ fontWeight: 500, fontSize: 11, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 12, textAlign: 'center' }}>How it works</p>
          <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 38px)', lineHeight: 1.1, letterSpacing: -1, marginBottom: 32, textAlign: 'center' }}>
            Reading everything<br /><em>so you don&rsquo;t have to.</em>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { step: '1', label: 'Pick your field & topic', desc: 'Choose from Medicine, CS, Social Science, Humanities, or 130+ sub-fields.', color: 'var(--lavender)' },
              { step: '2', label: 'We fetch from 5 sources', desc: 'OpenAlex, Semantic Scholar, Unpaywall, CORE, and preprint servers — up to 1,500 papers.', color: 'var(--sky)' },
              { step: '3', label: 'AI reads every abstract', desc: 'Claude Opus 4.7 extracts signals via Map-Reduce, then synthesises and ranks gaps.', color: 'var(--mint)' },
              { step: '4', label: 'You get evidence-backed gaps', desc: 'Each gap comes with a novelty score, category, and verbatim citations.', color: 'var(--butter)' },
            ].map((s) => (
              <div key={s.step} className="surface-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="display" style={{ fontSize: 20, color: 'var(--ink)' }}>{s.step}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demo gap card ── */}
        <section style={{ maxWidth: 520, margin: '0 auto 100px' }}>
          <p style={{ fontWeight: 500, fontSize: 11, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 12, textAlign: 'center' }}>Real gap · from a test run</p>
          <div className="surface-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--sky)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="display" style={{ fontSize: 20, color: 'var(--ink)' }}>1</span>
              </div>
              <div>
                <div className="category-pill" style={{ background: 'var(--sky)', marginBottom: 8 }}><span className="dot" /><span>Future work</span></div>
                <h3 className="display" style={{ fontSize: 20, lineHeight: 1.2, letterSpacing: -0.4 }}>
                  Predictors of durable remission vs early relapse in{' '}
                  <span style={{ background: 'var(--ink)', borderRadius: 6, padding: '0 8px', color: 'transparent', boxShadow: '0 0 6px rgba(0,0,0,0.5)' }}>CAR-T responders beyond 12 months</span>
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 12, borderTop: '1px solid var(--hair)' }}>
              <ScoreDial value={8} label="Novelty" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, border: '2px dashed var(--hair)' }} />
                <span style={{ fontWeight: 500, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>Feasibility<br />locked</span>
              </div>
            </div>
          </div>
          {/* Blurred stack */}
          <div style={{ marginTop: 10, opacity: 0.5 }}>
            {['var(--mint)', 'var(--butter)', 'var(--lavender)'].map((c, i) => (
              <div key={i} className="surface-card" style={{ display: 'flex', gap: 12, marginBottom: 8, padding: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: c, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 8, background: 'var(--hair)', borderRadius: 4, marginBottom: 8, width: '40%' }} />
                  <div style={{ height: 14, background: 'var(--hair)', borderRadius: 4, marginBottom: 6, width: '85%' }} />
                  <div style={{ height: 14, background: 'var(--hair)', borderRadius: 4, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>Sign up to unlock all gaps, feasibility scores, and full evidence.</p>
        </section>

        {/* ── Features grid ── */}
        <section style={{ marginBottom: 100 }}>
          <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 38px)', lineHeight: 1.1, letterSpacing: -1, marginBottom: 32, textAlign: 'center' }}>
            Built for <em>real</em> researchers.
          </h2>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {[
              { icon: 'book', title: '1,500-paper corpus', desc: 'Every analysis scans up to 1,500 documents across 5 academic databases.', color: 'var(--lavender)' },
              { icon: 'bolt', title: '45-second analysis', desc: 'From topic to grounded gaps in under a minute — faster than reading one paper.', color: 'var(--butter)' },
              { icon: 'target', title: 'Novelty + Feasibility scoring', desc: 'Each gap is ranked by a 10-point novelty and feasibility dial.', color: 'var(--mint)' },
              { icon: 'quote', title: 'Verbatim citations', desc: 'Every gap is backed by exact quotes from source papers. No hallucinations.', color: 'var(--sky)' },
              { icon: 'layers', title: 'Structured frameworks', desc: "PICO, SPIDER, PRISMA-aligned frames match your field's ontology.", color: 'var(--peach)' },
              { icon: 'globe', title: '130+ sub-fields', desc: 'Medicine, CS, Social Sciences, Humanities, Engineering, and more.', color: 'var(--rose)' },
            ].map((f) => (
              <div key={f.title} className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="chip-icon" style={{ width: 44, height: 44 }}>
                  <SvgIcon name={f.icon} size={20} color="var(--ink)" />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section style={{ maxWidth: 440, margin: '0 auto 60px', textAlign: 'center' }}>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: -1, marginBottom: 8 }}>Go <em>deeper.</em></h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 20 }}>Free forever with 3 analyses per month. Pro plan unlocks unlimited analyses, full gap lists, and Zotero sync.</p>
          <a href="#waitlist" className="btn-cta" style={{ textDecoration: 'none' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Join the waitlist</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Coming soon to iOS &amp; Android</div>
            </div>
            <div className="arrow-circle"><SvgIcon name="arrow" size={18} color="var(--ink)" /></div>
          </a>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: '1px solid var(--hair)', padding: '24px 0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Image src="/logo.png" alt="Lacunose" width={24} height={24} style={{ borderRadius: 6 }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>© {new Date().getFullYear()} Lacunose. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link href="/privacy" style={{ fontSize: 13, color: 'var(--muted)' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: 'var(--muted)' }}>Terms</Link>
            <a href="mailto:support@lacunose.com" style={{ fontSize: 13, color: 'var(--muted)' }}>Contact</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
