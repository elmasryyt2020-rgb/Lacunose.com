import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import { mockGapItems } from '../lib/mocks/gapItems';

export function useGapStream(analysisId: string) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (isMockMode) {
      let active = true;
      (async () => {
        for (const item of mockGapItems) {
          if (!active) break;
          await new Promise(r => setTimeout(r, 2000));
          setItems(prev => [...prev, item].sort((a, b) => a.rank - b.rank));
        }
      })();
      return () => { active = false; };
    }

    const channel = supabase.channel(`gap_items_${analysisId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gap_items', filter: `analysis_id=eq.${analysisId}` }, payload => {
        setItems(prev => [...prev, payload.new].sort((a, b) => a.rank - b.rank));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [analysisId]);

  return items;
}
