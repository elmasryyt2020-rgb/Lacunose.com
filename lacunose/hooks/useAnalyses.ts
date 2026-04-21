import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import { mockAnalyses } from '../lib/mocks/analyses';

export function useAnalyses(opts?: { limit?: number }) {
  // queryKey must include limit (even if undefined) so 'home (limit=3)' and
  // 'library (no limit)' don't share a cache entry.
  return useQuery({
    queryKey: ['analyses', opts?.limit ?? null],
    queryFn: async () => {
      if (isMockMode) return mockAnalyses.slice(0, opts?.limit ?? mockAnalyses.length);
      let q = supabase.from('gap_analyses').select('*, gap_items(count)').order('created_at', { ascending: false });
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
  });
}

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: async () => {
      if (isMockMode) return mockAnalyses.find(a => a.id === id) || mockAnalyses[0];
      const { data, error } = await supabase.from('gap_analyses').select('*, gap_items(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    // Don't fire .eq('id', '').single() when the route hasn't provided an id.
    enabled: !!id,
  });
}
