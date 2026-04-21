export type ConceptHit = { openalex_id: string; name: string; hint?: string; works_count: number; level: number };

export async function searchConcepts(query: string, signal?: AbortSignal) {
  if (query.trim().length < 2) return [];
  const res = await fetch(
    `https://api.openalex.org/autocomplete/concepts?q=${encodeURIComponent(query)}&per_page=10`,
    { signal, headers: { 'User-Agent': 'Lacunose/1.0 (mailto:hello@lacunose.com)' } }
  );
  if (!res.ok) throw new Error('openalex');
  const json = await res.json();
  return (json.results ?? []).map((r: any) => ({
    openalex_id: r.id.replace('https://openalex.org/', ''),
    name: r.display_name,
    hint: r.hint,
    works_count: r.works_count,
    level: r.level ?? 0,
  })) as ConceptHit[];
}
