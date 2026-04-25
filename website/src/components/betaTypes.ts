/**
 * Types for /api/beta/* routes. Mirror the shapes the backend returns so the
 * UI can render without `any`. We don't share @lacunose/types with the website
 * (the backend's type package isn't published; cross-repo linking is more
 * hassle than it's worth for Day 1), so these are hand-typed copies.
 */

export type GapEvidence = {
  paper_id: string;
  quote: string;
  section_id?: string;
  section_kind?: string;
  paper_title?: string;
  paper_year?: number | null;
  paper_venue?: string | null;
  paper_authors?: string;
  relevance?: number;
};

export type GapItem = {
  id?: string;
  analysis_id?: string;
  rank: number;
  title: string;
  description: string;
  category: string;
  novelty_score: number;
  feasibility_score: number;
  evidence_density: number;
  research_question: string;
  suggested_method: string;
  suggested_n?: number | null;
  suggested_duration_months?: number | null;
  evidence: GapEvidence[];
};

export type AnalysisStatus = 'queued' | 'running' | 'done' | 'failed';

export type Analysis = {
  id: string;
  topic: string;
  field: string;
  status: AnalysisStatus;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
  cost_tokens?: {
    input?: number;
    output?: number;
    cached?: number;
    calls?: number;
    cost_usd?: number;
  } | null;
};

export type CreateAnalysisResponse = {
  id: string;
  status: AnalysisStatus;
  claim_token: string;
  claim_expires_at: string;
};

export type PollAnalysisResponse = {
  analysis: Analysis;
  gaps: GapItem[];
};

// ---------------------------------------------------------------------------
// SSE event payloads emitted by GET /api/beta/compare-stream/:id
// ---------------------------------------------------------------------------

export type CompareStreamMeta = {
  analysis_id: string;
  model: string;
  paper_set_source: 'analysis_row' | 'cited_evidence' | 'pending';
  paper_count: number;
  sections: number;
};

export type CompareStreamPhase = {
  phase: 'map' | 'map_done' | 'cluster' | 'cluster_done' | 'reduce_critique';
  signals?: number;
  clusters?: number;
  startedAt?: number;
  t?: number;
};

export type CompareStreamGap = GapItem & {
  cluster_index?: number;
  emitted_index?: number;
  t?: number;
};

export type CompareStreamDone = {
  count: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  calls: number;
  model: string;
  total_ms: number;
  gaps: GapItem[];
  // Surfaced so the UI can explain a 0-gaps Haiku column ("3 produced, 3
  // dropped in critique") instead of showing the bare "No gaps produced."
  candidates_produced?: number;
  candidates_dropped_in_critique?: number;
};

export type CompareStreamError = {
  error: string;
  message?: string;
};

export type CompareResponse = {
  analysis_id: string;
  topic: string;
  field: string;
  opus: {
    model: string;
    gaps: GapItem[];
    cost_usd: number | null;
    cost_tokens: Analysis['cost_tokens'];
  };
  haiku: {
    model: string;
    gaps: GapItem[];
    cost_usd: number;
    cost_tokens: {
      input: number;
      output: number;
      cached: number;
      calls: number;
      models: string[];
    };
    error: string | null;
  };
};
