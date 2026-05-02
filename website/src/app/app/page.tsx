'use client';

/**
 * /app — Lacunose beta web app + Opus-vs-Haiku compare demo.
 *
 * Single page, three states:
 *   - gate:    invite-code entry (sets httpOnly session cookie via /api/beta/verify)
 *   - entry:   topic + field picker + optional structured frame
 *   - results: streaming gap cards, poll-based.
 *
 * All mobile-app design tokens are reused via CSS variables in globals.css
 * and CSS-module classes in app.module.css. Shared SVG primitives
 * (SvgIcon, ScoreDial, CategoryPill, ChipIcon, RankBadge) live in
 * src/components/Shared.tsx.
 *
 * The page performs ONLY browser work — all backend calls go through
 * /api/beta/* Next.js route handlers so the BETA_INVITE_CODE never leaves
 * the server.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './app.module.css';
import {
  SvgIcon, ScoreDial, CategoryPill, ChipIcon, RankBadge,
} from '../../components/Shared';
import { FIELDS, QUICK_FIELD_IDS, getField } from '../../components/fields';
import type {
  GapItem, CreateAnalysisResponse, PollAnalysisResponse,
  CompareResponse, AnalysisStatus,
  CompareStreamMeta, CompareStreamPhase, CompareStreamGap, CompareStreamDone,
} from '../../components/betaTypes';

// ---------------------------------------------------------------------------
// Device id — stable per-browser identifier for the backend's device_id slot.
// Not a secret; used only to correlate beta-tester sessions in logs.
// ---------------------------------------------------------------------------

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder';
  const key = 'lacunose_device_id';
  let v = window.localStorage.getItem(key);
  if (!v) {
    v = 'web-' + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
    try { window.localStorage.setItem(key, v); } catch { /* private mode */ }
  }
  return v;
}

// ---------------------------------------------------------------------------
// Persistent session helpers — remember the last analysis so a reload on
// /app doesn't lose a long-running run.
// ---------------------------------------------------------------------------

type RunHandle = {
  id: string;
  token: string;
  topic: string;
  field: string;
};

function loadRun(): RunHandle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('lacunose_current_run');
    if (!raw) return null;
    return JSON.parse(raw) as RunHandle;
  } catch { return null; }
}

function saveRun(h: RunHandle | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (h) window.localStorage.setItem('lacunose_current_run', JSON.stringify(h));
    else   window.localStorage.removeItem('lacunose_current_run');
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------

type Screen = 'gate' | 'entry' | 'results';

export default function BetaAppPage() {
  const [screen, setScreen] = useState<Screen>('gate');
  const [bootstrapping, setBootstrapping] = useState(true);

  // On mount, try to detect an existing session (by hitting /api/beta/analyze
  // with a ping — cheap 401 if no session). Also re-hydrate any in-flight run.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = loadRun();
      // A trivial way to probe the cookie without a dedicated /me endpoint:
      // try to GET an analysis that requires session. If session is missing,
      // we get 401 and stay on gate. If we have a saved run, we jump to
      // results; otherwise we jump to entry.
      try {
        const probe = await fetch(
          existing
            ? `/api/beta/analyze/${encodeURIComponent(existing.id)}?token=${encodeURIComponent(existing.token)}`
            : '/api/beta/analyze',
          { method: existing ? 'GET' : 'POST', body: existing ? undefined : '{}', headers: existing ? {} : { 'Content-Type': 'application/json' } },
        );
        if (cancelled) return;
        if (probe.status === 401) {
          setScreen('gate');
        } else if (existing && probe.ok) {
          setScreen('results');
        } else {
          // Any other non-401 means we have a session but no valid run;
          // the POST fallback probe will 400 from an empty body, which
          // still indicates auth passed.
          setScreen(probe.status === 400 ? 'entry' : (existing ? 'results' : 'entry'));
        }
      } catch {
        setScreen('gate');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className={styles.page}>
      {/* Ambient blobs to match the landing page */}
      <div className={styles.ambient}>
        <div className="blob" style={{ top: 80, right: -40, width: 260, height: 260, background: 'var(--butter)' }} />
        <div className="blob" style={{ top: 320, left: -80, width: 320, height: 320, background: 'var(--sky)' }} />
        <div className="blob" style={{ bottom: 200, left: '30%', width: 240, height: 240, background: 'var(--mint)' }} />
      </div>

      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <Image src="/logo.png" alt="Lacunose" width={36} height={36} style={{ borderRadius: 10 }} />
            <span className={styles.brandName}>Lacunose</span>
          </Link>
          <div className={styles.navRight}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Beta</span>
          </div>
        </nav>

        {bootstrapping ? (
          <Bootstrapping />
        ) : screen === 'gate' ? (
          <Gate onUnlock={() => setScreen('entry')} />
        ) : screen === 'entry' ? (
          <Entry onStarted={() => setScreen('results')} />
        ) : (
          <Results onReset={() => setScreen('entry')} />
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Bootstrapping state
// ---------------------------------------------------------------------------

function Bootstrapping() {
  return (
    <div style={{ marginTop: 80, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
      <span className={styles.spin} style={{ display: 'inline-block' }}>
        <SvgIcon name="spinner" size={24} color="var(--ink)" />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/beta/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        onUnlock();
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error === 'invalid_code' ? 'That code didn’t work. Double-check the email we sent you.' : 'Sign-in failed. Please retry.');
      }
    } catch {
      setErr('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.gateCard}>
      <div className={styles.gateTitle}>Lacunose beta</div>
      <div className={styles.gateSub}>
        Enter your invite code to open the research-gap engine.<br />
        Running on the reasoning core.
      </div>
      <form onSubmit={submit}>
        <input
          className={styles.gateInput}
          type="text"
          placeholder="invite code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <div>
          <button type="submit" className={styles.primary} disabled={loading || !code}>
            {loading ? 'Verifying…' : 'Unlock'}
          </button>
        </div>
      </form>
      {err && <div className={styles.gateError}>{err}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

function Entry({ onStarted }: { onStarted: () => void }) {
  const [topic, setTopic] = useState('');
  const [fieldId, setFieldId] = useState<string>('medicine');
  const [frame, setFrame] = useState<Record<string, string>>({});
  const [showAllFields, setShowAllFields] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const field = getField(fieldId);
  const maxChars = 240;

  const submit = async () => {
    const t = topic.trim();
    if (t.length < 3) {
      setErr('Topic must be at least 3 characters.');
      return;
    }
    setSubmitting(true);
    setErr(null);

    const structured_frame: Record<string, string> = {};
    for (const [k, v] of Object.entries(frame)) {
      const s = v?.trim() ?? '';
      if (s) structured_frame[k] = s;
    }

    try {
      const res = await fetch('/api/beta/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: t,
          field: fieldId,
          device_id: getDeviceId(),
          ...(Object.keys(structured_frame).length > 0 ? { structured_frame } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${res.status}`);
      }
      const json = (await res.json()) as CreateAnalysisResponse;
      saveRun({ id: json.id, token: json.claim_token, topic: t, field: fieldId });
      onStarted();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(`Could not start analysis: ${msg}`);
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.entryTitle}>
        What area of <em style={{ fontStyle: 'italic' }}>{field.label}</em> do you want to explore?
      </div>

      {/* Field picker */}
      <div className={styles.fieldScroll}>
        {QUICK_FIELD_IDS.map((qid) => {
          const f = getField(qid);
          return (
            <button
              key={qid}
              type="button"
              className={`${styles.fieldChip} ${qid === fieldId ? styles.fieldChipActive : ''}`}
              onClick={() => { setFieldId(qid); setFrame({}); }}
            >
              {f.label}
            </button>
          );
        })}
        <button
          type="button"
          className={`${styles.fieldChip} ${!QUICK_FIELD_IDS.includes(fieldId as typeof QUICK_FIELD_IDS[number]) ? styles.fieldChipActive : ''}`}
          onClick={() => setShowAllFields((s) => !s)}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <SvgIcon name="sparkle" size={14} color={!QUICK_FIELD_IDS.includes(fieldId as typeof QUICK_FIELD_IDS[number]) ? 'var(--bg)' : 'var(--ink)'} />
            {showAllFields ? 'Less' : 'More fields'}
          </span>
        </button>
      </div>
      {showAllFields && (
        <div className={styles.fieldScroll} style={{ marginTop: -8 }}>
          {FIELDS.filter((f) => !QUICK_FIELD_IDS.includes(f.id as typeof QUICK_FIELD_IDS[number])).map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.fieldChip} ${f.id === fieldId ? styles.fieldChipActive : ''}`}
              onClick={() => { setFieldId(f.id); setFrame({}); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Topic box */}
      <div className={styles.entryCard}>
        <div className={styles.cardLabel}>Topic</div>
        <textarea
          className={styles.topicInput}
          placeholder="e.g. long-term cardiovascular outcomes of semaglutide in elderly patients"
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, maxChars))}
          autoFocus
        />
        <div className={styles.charCount}>{topic.length} / {maxChars}</div>
      </div>

      {/* Structured frame (optional) */}
      <div className={styles.entryCard}>
        <div className={styles.cardLabel}>Frame (optional)</div>
        {field.frame.map((row, i) => {
          const rowColors = ['var(--sky)', 'var(--mint)', 'var(--lavender)', 'var(--butter)'];
          return (
            <div key={row.key} className={styles.frameRow}>
              <div
                className={styles.frameBadge}
                style={{ background: rowColors[i % rowColors.length] }}
              >{row.key}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.frameLabel}>{row.label}</div>
                <input
                  className={styles.frameInput}
                  type="text"
                  placeholder={row.placeholder}
                  value={frame[row.key] ?? ''}
                  onChange={(e) => setFrame((prev) => ({ ...prev, [row.key]: e.target.value }))}
                />
              </div>
            </div>
          );
        })}
      </div>

      {err && <div className={styles.errorCard}>{err}</div>}

      <button className={styles.cta} onClick={submit} disabled={submitting || topic.trim().length < 3}>
        <span>{submitting ? 'Starting…' : 'Find gaps'}</span>
        <span className={styles.ctaSub}>≈ 45 sec · up to 500 papers</span>
        <span style={{ background: 'var(--bg)', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SvgIcon name="arrow" size={16} color="var(--ink)" />
        </span>
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const PROGRESS_STEPS: Array<{ id: string; label: string }> = [
  { id: 'queued',    label: 'Queued analysis' },
  { id: 'fetching',  label: 'Fetching papers from 5 sources' },
  { id: 'reading',   label: 'Reading abstracts · extracting signals' },
  { id: 'synth',     label: 'Synthesizing gaps' },
];

function Results({ onReset }: { onReset: () => void }) {
  const handleRef = useRef<RunHandle | null>(loadRun());
  const [status, setStatus] = useState<AnalysisStatus>('queued');
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [meta, setMeta] = useState<PollAnalysisResponse['analysis'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailGap, setDetailGap] = useState<GapItem | null>(null);
  const startedAt = useRef<number>(Date.now());

  // Poll loop
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/beta/analyze/${encodeURIComponent(h.id)}?token=${encodeURIComponent(h.token)}`,
        );
        if (!res.ok) {
          if (res.status === 404) {
            setError('Analysis not found. It may have expired; please start a new one.');
            return;
          }
          throw new Error(`poll http ${res.status}`);
        }
        const json = (await res.json()) as PollAnalysisResponse;
        if (cancelled) return;
        setMeta(json.analysis);
        setStatus(json.analysis.status);
        setGaps(json.gaps ?? []);
        if (json.analysis.status === 'done' || json.analysis.status === 'failed') {
          // Defensive guard: in some flows the polling can stop on a response
          // where status is already 'done' but cost_tokens hasn't finished
          // serializing through PostgREST yet (or arrives empty). One extra
          // refetch after a short delay closes that race so the Opus column
          // always shows its $/calls counter.
          const hasCost =
            json.analysis.cost_tokens != null &&
            typeof json.analysis.cost_tokens === 'object' &&
            (json.analysis.cost_tokens as { cost_usd?: number }).cost_usd !== undefined;
          if (!hasCost && json.analysis.status === 'done') {
            timer = setTimeout(async () => {
              if (cancelled) return;
              try {
                const r2 = await fetch(
                  `/api/beta/analyze/${encodeURIComponent(h.id)}?token=${encodeURIComponent(h.token)}`,
                );
                if (!r2.ok || cancelled) return;
                const j2 = (await r2.json()) as PollAnalysisResponse;
                if (cancelled) return;
                setMeta(j2.analysis);
                setGaps(j2.gaps ?? []);
              } catch { /* swallow — final cost is best-effort */ }
            }, 1500);
          }
          return;
        }
        timer = setTimeout(tick, 2500);
      } catch (e) {
        if (cancelled) return;
        // Transient errors: keep polling but with backoff.
        timer = setTimeout(tick, 5000);
        console.warn('poll failed', e);
      }
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Derived: progress step
  const stepIndex = useMemo(() => {
    if (status === 'queued') return 0;
    if (status === 'running' && gaps.length === 0) return 2;
    if (status === 'running') return 3;
    if (status === 'done') return 4;
    return 0;
  }, [status, gaps.length]);

  const elapsedSec = Math.floor((Date.now() - startedAt.current) / 1000);

  const h = handleRef.current;
  if (!h) {
    // Should not happen (Bootstrapping would have kept us on entry), but be
    // defensive so a direct navigation to /app doesn't error out.
    return (
      <div className={styles.errorCard}>
        No active analysis. <button onClick={onReset} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Start one →</button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.resultsHead}>
        <div className={styles.resultsTitleBlock}>
          <div className={styles.resultsMeta}>Analysis · {getField(h.field).label}</div>
          <div className={styles.resultsTitle}>{h.topic}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={styles.compareBtn}
            onClick={() => { saveRun(null); onReset(); }}
            style={{ borderColor: 'var(--hair)' }}
          >
            New analysis
          </button>
        </div>
      </div>

      {/* Progress tracker (hidden once results stream in) */}
      {status !== 'done' && status !== 'failed' && (
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(stepIndex / PROGRESS_STEPS.length) * 100}%` }}
            />
          </div>
          {PROGRESS_STEPS.map((s, i) => {
            const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending';
            return (
              <div
                key={s.id}
                className={`${styles.progressStep} ${
                  state === 'active' ? styles.progressStepActive
                  : state === 'done' ? styles.progressStepDone
                  : styles.progressStepPending
                }`}
              >
                {state === 'done'
                  ? <SvgIcon name="check" size={14} color="var(--ink-soft)" />
                  : state === 'active'
                    ? <span className={styles.spin} style={{ display: 'inline-flex' }}>
                        <SvgIcon name="spinner" size={14} />
                      </span>
                    : <SvgIcon name="clock" size={14} color="var(--muted)" />}
                {s.label}
              </div>
            );
          })}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Step {Math.min(stepIndex + 1, PROGRESS_STEPS.length)} of {PROGRESS_STEPS.length}</span>
            <span>{elapsedSec}s elapsed</span>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className={styles.errorCard}>
          Analysis failed{meta?.error ? `: ${meta.error}` : '.'}
          <br />
          <button onClick={() => { saveRun(null); onReset(); }} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6 }}>
            Try a different topic →
          </button>
        </div>
      )}

      {error && <div className={styles.errorCard}>{error}</div>}

      <div className={styles.gapList}>
          {gaps.map((g) => (
            <GapCard key={g.rank} gap={g} onClick={() => setDetailGap(g)} />
          ))}
          {gaps.length === 0 && status === 'done' && (
            <div className={styles.errorCard}>
              No gaps surfaced. This sometimes happens with very narrow topics or sparse literature. Try broadening the topic.
            </div>
          )}
        </div>

      {/* Detail modal */}
      {detailGap && <DetailModal gap={detailGap} onClose={() => setDetailGap(null)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Gap card
// ---------------------------------------------------------------------------

function GapCard({ gap, onClick }: { gap: GapItem; onClick: () => void }) {
  return (
    <div className={styles.gapCard} onClick={onClick}>
      <div className={styles.gapHead}>
        <RankBadge rank={gap.rank} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.gapPill}>
            <CategoryPill kind={gap.category} />
          </div>
          <div className={styles.gapTitle}>{gap.title}</div>
        </div>
      </div>
      <div className={styles.gapDesc}>{gap.description}</div>
      <div className={styles.gapDials}>
        <ScoreDial value={gap.novelty_score} max={10} label="Novelty" color="var(--ink)" />
        <ScoreDial value={gap.feasibility_score} max={10} label="Feasibility" color="var(--ink)" />
      </div>
      <div className={styles.gapEvidence}>
        <span>Evidence · {gap.evidence?.length ?? 0} paper{(gap.evidence?.length ?? 0) === 1 ? '' : 's'} · Verified</span>
        <SvgIcon name="chevR" size={14} color="var(--muted)" />
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function DetailModal({ gap, onClose }: { gap: GapItem; onClose: () => void }) {
  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <ChipIcon name="close" size={40} iconSize={18} onClick={onClose} ariaLabel="Close detail" />
          <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Gap #{gap.rank}
          </span>
        </div>

        <div className={styles.modalCategory}><CategoryPill kind={gap.category} /></div>
        <div className={styles.modalTitle}>{gap.title}</div>

        <div className={styles.scoreRow}>
          <div className={styles.scoreCell} style={{ background: 'var(--sky)' }}>
            <div className={styles.scoreCellLabel}>Novelty</div>
            <div className={styles.scoreCellValue}>{gap.novelty_score}<span className={styles.scoreCellMax}>/10</span></div>
          </div>
          <div className={styles.scoreCell} style={{ background: 'var(--mint)' }}>
            <div className={styles.scoreCellLabel}>Feasibility</div>
            <div className={styles.scoreCellValue}>{gap.feasibility_score}<span className={styles.scoreCellMax}>/10</span></div>
          </div>
          <div className={styles.scoreCell} style={{ background: 'var(--butter)' }}>
            <div className={styles.scoreCellLabel}>Evidence</div>
            <div className={styles.scoreCellValue}>{Math.round(gap.evidence_density)}<span className={styles.scoreCellMax}>/10</span></div>
          </div>
        </div>

        {gap.description && (
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-soft)', marginBottom: 14 }}>
            {gap.description}
          </div>
        )}

        <div className={styles.rqPanel}>
          <div className={styles.rqPanelLabel}>Research question</div>
          <div className={styles.rqPanelText}>{gap.research_question}</div>
        </div>

        <div className={styles.methodPanel}>
          <div className={styles.methodPanelLabel}>Suggested method</div>
          <div className={styles.methodPanelText}>{gap.suggested_method}</div>
          {(gap.suggested_n || gap.suggested_duration_months) && (
            <div className={styles.methodPanelSub}>
              {gap.suggested_n ? `Est. N ≈ ${gap.suggested_n}` : ''}
              {gap.suggested_n && gap.suggested_duration_months ? ' · ' : ''}
              {gap.suggested_duration_months ? `${gap.suggested_duration_months} mo` : ''}
            </div>
          )}
        </div>

        {gap.evidence && gap.evidence.length > 0 && (
          <div className={styles.evidencePanel}>
            <div className={styles.evidencePanelHead}>
              <div className={styles.evidencePanelTitle}>Evidence</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {gap.evidence.length} paper{gap.evidence.length === 1 ? '' : 's'}
              </div>
            </div>
            {gap.evidence.map((e, i) => (
              <div key={i} className={styles.evidenceItem}>
                <div className={styles.evidenceQuote}>&ldquo;{e.quote}&rdquo;</div>
                <div className={styles.evidenceMeta}>
                  {[e.paper_authors, e.paper_venue, e.paper_year].filter(Boolean).join(' · ')}
                  {e.section_kind ? ` · ${e.section_kind}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

