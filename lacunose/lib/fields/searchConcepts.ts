export type ConceptHit = { openalex_id: string; name: string; hint?: string; works_count: number; level: number };

/**
 * Query OpenAlex autocomplete. Prefers `/autocomplete/topics` (2024+ schema)
 * with `/autocomplete/concepts` as a fallback for older deployments.
 */
export async function searchConcepts(query: string, signal?: AbortSignal): Promise<ConceptHit[]> {
  if (query.trim().length < 2) return [];
  const encoded = encodeURIComponent(query);

  for (const path of ['autocomplete/topics', 'autocomplete/concepts']) {
    try {
      const res = await fetch(
        `https://api.openalex.org/${path}?q=${encoded}&per_page=10`,
        { signal, headers: { 'User-Agent': 'Lacunose/1.0 (mailto:hello@lacunose.com)' } }
      );
      if (!res.ok) continue; // try the next path
      const json = await res.json();
      const results = (json.results ?? []).map((r: any) => ({
        openalex_id: String(r.id ?? '').replace('https://openalex.org/', ''),
        name: r.display_name,
        hint: r.hint,
        works_count: r.works_count ?? 0,
        level: r.level ?? 0,
      })) as ConceptHit[];
      if (results.length > 0) return results;
    } catch {
      // fall through to next path
    }
  }
  return [];
}
