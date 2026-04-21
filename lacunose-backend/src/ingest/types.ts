/**
 * Local types for the ingestion layer.
 * Composes shared types from @lacunose/types.
 */
import type { PaperSource, RawPaper } from '@lacunose/types';

export interface SearchQuery {
  topic: string;
  field?: string;
  /** OpenAlex concept ID filter if known (e.g. "C71924100"). */
  concept_id?: string;
  years?: [number, number];
  include_preprints?: boolean;
  open_access_only?: boolean;
  /** Per-source cap on the number of papers to yield. */
  limit: number;
}

export interface SourceAdapter {
  id: PaperSource;
  label: string;
  /** Fields this adapter is useful for. 'all' or an array of FieldId strings. */
  applicableFields: 'all' | string[];
  search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper>;
  resolveFullText?(paper: RawPaper): Promise<string | null>;
}

export type { RawPaper, PaperSource };
