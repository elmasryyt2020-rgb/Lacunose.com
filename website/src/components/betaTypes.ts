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
