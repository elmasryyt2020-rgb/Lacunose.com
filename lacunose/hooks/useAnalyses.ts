import { useEffect } from 'react';
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
      let q = supabase
        .from('gap_analyses')
        .select('*, gap_items(title, novelty_score, category, rank)')
        .order('created_at', { ascending: false })
        .order('rank', { foreignTable: 'gap_items', ascending: true })
        .limit(1, { foreignTable: 'gap_items' });
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
  });
}

export function useAnalysis(id: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['analysis', id],
    queryFn: async () => {
      if (isMockMode) return mockAnalyses.find(a => a.id === id) || mockAnalyses[0];
      const { data, error } = await supabase.from('gap_analyses').select('*, gap_items(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    // Don't fire .eq('id', '').single() when the route hasn't provided an id.
    enabled: !!id,
    // Poll every 3s while running — Realtime UPDATE events cover most cases
    // but a fallback poll guarantees we catch `status: 'done'` even if the
    // websocket blips.
    refetchInterval: (q) => {
      const status = (q.state.data as { status?: string } | undefined)?.status;
      return status && status !== 'done' && status !== 'failed' ? 3000 : false;
    },
  });

  // Live-update via Realtime UPDATE on the gap_analyses row — instant status
  // transitions (queued → running → done) without waiting for the 3s poll.
  useEffect(() => {
    if (!id || isMockMode) return;
    const channel = supabase.channel(`gap_analysis_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gap_analyses', filter: `id=eq.${id}` },
        () => { void queryClient.invalidateQueries({ queryKey: ['analysis', id] }); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, queryClient]);

  return query;
}
