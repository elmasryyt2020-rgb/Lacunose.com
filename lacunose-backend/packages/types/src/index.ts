/**
 * Shared types for Lacunose.
 *
 * Consumed by both the backend (workers, edge-fn) and the mobile app
 * (via a symlink or copied snapshot).
 *
 * NO runtime code. Types + small constant arrays only.
 */

// ---------------------------------------------------------------------------
// Gap categories (universal across fields) + category colour bindings
// ---------------------------------------------------------------------------

export const GAP_CATEGORIES = [
  'future-work',
  'coverage',
  'methodology',
  'contradiction',
  'geographic',
  'population',
  'intersection',
  'temporal',
] as const;
export type GapCategory = (typeof GAP_CATEGORIES)[number];

/** Colour key used by the mobile theme palette (see lacunose/constants/theme.ts). */
export type CategoryColor =
  | 'sky' | 'mint' | 'lavender' | 'butter'
  | 'peach' | 'rose' | 'sage';

export const CATEGORY_COLOR: Record<GapCategory, CategoryColor> = {
  'future-work':   'sky',
  'coverage':      'lavender',
  'methodology':   'mint',
  'contradiction': 'rose',
  'geographic':    'peach',
  'population':    'butter',
  'intersection':  'sage',
  'temporal':      'sky',
};

// ---------------------------------------------------------------------------
// Fields — taxonomy keys (mirrors lib/fields/frames.ts on the mobile side)
// ---------------------------------------------------------------------------

export const FIELD_IDS = [
  'medicine', 'biology', 'chemistry', 'physics', 'materials', 'mathematics',
  'computer-science', 'engineering', 'psychology', 'economics',
  'political-science', 'sociology', 'geology', 'geography',
  'history', 'philosophy', 'art', 'business', 'environmental-science',
  'generic',
] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export interface FieldFrameRow {
  key: string;
  label: string;
  color: CategoryColor;
  placeholder: string;
  example: string;
}
export interface FieldFrame {
  id: FieldId | string;
  label: string;
  /** OpenAlex domain concept ID (e.g. "C71924100" for Medicine). */
  domainOpenalexId?: string;
  rows: FieldFrameRow[];
}

// ---------------------------------------------------------------------------
// Papers & sections (the shared corpus)
// ---------------------------------------------------------------------------

export interface Paper {
  id: string;
  doi?: string | null;
  pmid?: string | null;
  arxiv_id?: string | null;
  openalex_id?: string | null;
  s2_id?: string | null;
  title: string;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  field?: string[] | null;
  authors?: Author[] | null;
  citation_count?: number | null;
  full_text_url?: string | null;
  source: PaperSource;
  ingested_at: string;
}

export interface Author {
  name: string;
  orcid?: string | null;
  affiliation?: string | null;
}

export type PaperSource =
  | 'openalex' | 's2' | 'crossref' | 'pubmed' | 'europepmc' | 'arxiv' | 'unpaywall';

export type SectionKind =
  | 'abstract' | 'intro' | 'methods' | 'results'
  | 'discussion' | 'limitations' | 'future_work' | 'conclusion' | 'other';

export interface PaperSection {
  id: string;
  paper_id: string;
  kind: SectionKind;
  text: string;
  position: number;
}

export interface PaperEmbedding {
  paper_id: string;
  section_id: string;
  embedding: number[];          // length 768 (SPECTER2)
  adapter: string;
}

// ---------------------------------------------------------------------------
// Raw paper (shape returned by source adapters before dedupe)
// ---------------------------------------------------------------------------

export interface RawPaper {
  source: PaperSource;
  external_id: string;              // the source-native ID
  doi?: string | null;
  pmid?: string | null;
  arxiv_id?: string | null;
  openalex_id?: string | null;
  s2_id?: string | null;
  title: string;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  field?: string[] | null;
  authors?: Author[] | null;
  citation_count?: number | null;
  full_text_url?: string | null;
  references?: string[] | null;     // list of cited DOIs / external IDs
}

// ---------------------------------------------------------------------------
// Analyses + gaps (the user-facing output)
// ---------------------------------------------------------------------------

export type AnalysisStatus = 'queued' | 'running' | 'done' | 'failed';

export interface AnalysisFilters {
  years?: [number, number];
  include_preprints?: boolean;
  open_access_only?: boolean;
  study_designs?: string[];
}

export interface StructuredFrameValue {
  /** Maps row.key ('P', 'I', 'C', 'O', …) to user-entered text */
  [rowKey: string]: string;
}

export interface GapAnalysis {
  id: string;
  user_id: string;
  topic: string;
  field: FieldId | string;
  structured_frame?: StructuredFrameValue;
  filters?: AnalysisFilters;
  status: AnalysisStatus;
  error?: string | null;
  cost_tokens?: CostTokens;
  created_at: string;
  completed_at?: string | null;
}

export interface CostTokens {
  input?: number;
  output?: number;
  cached?: number;
  provider?: 'anthropic' | 'deepseek' | 'mock';
  model?: string;
}

export interface GapItem {
  id: string;
  analysis_id: string;
  rank: number;
  title: string;
  description: string;
  category: GapCategory;
  novelty_score: number;
  feasibility_score: number;
  evidence_density: number;
  research_question: string;
  suggested_method: string;
  suggested_n?: number | null;
  suggested_duration_months?: number | null;
  evidence: GapEvidence[];
  created_at: string;
}

export interface GapEvidence {
  paper_id: string;
  quote: string;
  section_id?: string;
  section_kind?: SectionKind;
  relevance?: number;
  paper_title?: string;    // denormalized for UI speed
  paper_year?: number;
  paper_venue?: string;
  paper_authors?: string;  // formatted "Smith et al."
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type Tier = 'free' | 'pro' | 'premium';

export interface Subscription {
  user_id: string;
  tier: Tier;
  rc_app_user_id?: string;
  rc_entitlement?: string;
  platform?: 'ios' | 'android';
  period_start?: string;
  period_end?: string;
  analyses_used_this_period: number;
  will_renew?: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Support (email-backed chat)
// ---------------------------------------------------------------------------

export interface SupportThread {
  id: string;
  user_id: string;
  ticket_code: string;         // 'LNS-0042'
  subject?: string;
  status: 'open' | 'pending' | 'closed';
  created_at: string;
  last_message_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  is_user: boolean;
  body: string;
  email_message_id?: string;
  in_reply_to?: string;
  attachments: Array<{ filename: string; url: string; mime?: string }>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Notifications + push
// ---------------------------------------------------------------------------

export type NotificationKind =
  | 'analysis_complete' | 'quota_reset' | 'support_reply' | 'welcome' | 'upgrade_success';

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface PushToken {
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

// ---------------------------------------------------------------------------
// Field concepts (OpenAlex cache)
// ---------------------------------------------------------------------------

export interface FieldConcept {
  openalex_id: string;
  level: number;
  name: string;
  parent_ids: string[];
  ancestors: string[];
  works_count?: number;
  frame_template?: FieldId | string;
}

// ---------------------------------------------------------------------------
// LLM abstraction
// ---------------------------------------------------------------------------

export type LLMProviderId = 'anthropic' | 'anthropic-allopus' | 'deepseek' | 'mock';

/** Semantic tier — calling code never names a vendor model directly. */
export type ModelTier = 'synth' | 'map' | 'critique';

export type LLMRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMMessage {
  role: LLMRole;
  content: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
  /** If true, apply provider-native prompt caching at this boundary (anthropic). */
  cache?: boolean;
}

export interface LLMToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ChatOptions {
  model: ModelTier;
  messages: LLMMessage[];
  tools?: LLMToolDef[];
  temperature?: number;
  maxTokens?: number;
  /** Request strict JSON output. Providers implement this differently. */
  jsonSchema?: Record<string, unknown>;
  /** Redis-backed response cache key. If set + hit, we skip the provider call. */
  cache?: { key: string; ttlSec: number };
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  };
  provider: LLMProviderId;
  model: string;
  latencyMs: number;
  cached?: boolean;
}

// ---------------------------------------------------------------------------
// Queue job payloads (BullMQ)
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  ingest:   'ingest',
  parse:    'parse',
  embed:    'embed',
  gap:      'gap',
  critique: 'critique',
  support:  'support',
} as const;

export interface IngestJob {
  analysis_id: string;
  user_id: string | null; // null for anonymous onboarding analyses
  topic: string;
  field: FieldId | string;
  structured_frame?: StructuredFrameValue;
  filters?: AnalysisFilters;
  /** OpenAlex concept ID of the selected field, if any. Used for corpus filtering. */
  concept_id?: string;
  /**
   * Anonymous onboarding runs cap corpus size + final gap count to reduce
   * cost. See src/gap/rank.ts + src/workers/ingest.ts for how this is applied.
   */
  is_anonymous?: boolean;
}

export interface ParseJob {
  paper_id: string;
  pdf_url: string;
}

export interface EmbedJob {
  paper_id: string;
  section_ids?: string[];     // default: all sections for this paper
}

export interface GapJob {
  analysis_id: string;
  user_id: string | null;
  field: FieldId | string;
  topic: string;
  structured_frame?: StructuredFrameValue;
  /** Paper IDs we already have in the corpus for this analysis. */
  paper_ids: string[];
  /** Anonymous runs trim final gap count to keep the teaser fast + cheap. */
  is_anonymous?: boolean;
}

export interface CritiqueJob {
  analysis_id: string;
  candidate_gap_ids: string[];
}

export type SupportJob =
  | { kind: 'send_outbound'; thread_id: string; message_id: string; body: string;
      user_email: string; user_id: string; ticket_code: string; parent_message_id?: string }
  | { kind: 'poll_inbox' };

// ---------------------------------------------------------------------------
// Edge-fn HTTP contracts
// ---------------------------------------------------------------------------

export interface CreateAnalysisRequest {
  topic: string;
  field: FieldId | string;
  structured_frame?: StructuredFrameValue;
  filters?: AnalysisFilters;
  concept_id?: string;
}
export interface CreateAnalysisResponse {
  id: string;
  status: AnalysisStatus;
}

export interface ExportAnalysisRequest {
  format: 'pdf' | 'md';
}
export interface ExportAnalysisResponse {
  url: string;
  format: 'pdf' | 'md';
  expires_at: string;
}

export interface SendSupportMessageRequest {
  body: string;
  /** Optional — if unknown, backend uses the user's active thread. */
  thread_id?: string;
}
export interface SendSupportMessageResponse {
  message: SupportMessage;
  thread: SupportThread;
}

export interface RegisterPushTokenRequest {
  token: string;
  platform: 'ios' | 'android';
}

// ---------------------------------------------------------------------------
// Field adapter metadata (server-side)
// ---------------------------------------------------------------------------

export interface FieldAdapter {
  id: FieldId | string;
  label: string;
  /** Ordered list of source IDs to query for this field, most specific first. */
  sources: PaperSource[];
  frame: FieldFrame;
  gapTaxonomy: GapCategory[];
  /** Per-field system prompt injected into LLM map + synth calls. */
  promptHints: {
    system: string;
    fewShot?: Array<{ input: unknown; output: unknown }>;
  };
  /** Lexicon used for keyword-based methodology-gap detection. */
  studyDesignVocab: string[];
}

// ---------------------------------------------------------------------------
// Result of a retrieval step (top-N reranked sections)
// ---------------------------------------------------------------------------

export interface RetrievedSection {
  paper_id: string;
  section_id: string;
  paper_title: string;
  paper_year?: number | null;
  paper_venue?: string | null;
  authors_short?: string;
  section_kind: SectionKind;
  text: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Mapped per-paper signal extraction
// ---------------------------------------------------------------------------

export interface GapSignal {
  paper_id: string;
  section_id: string;
  kind: 'future-work' | 'limitation' | 'contradiction-cue' | 'methodology-hint';
  phrase: string;        // extracted phrase
  quote: string;         // verbatim quote from the section
}

// ---------------------------------------------------------------------------
// A candidate gap produced by the reduce phase (pre-ranking, pre-critique)
// ---------------------------------------------------------------------------

export interface CandidateGap {
  title: string;
  description: string;
  category: GapCategory;
  novelty_score: number;
  feasibility_score: number;
  research_question: string;
  suggested_method: string;
  suggested_n?: number;
  suggested_duration_months?: number;
  evidence: GapEvidence[];
}
