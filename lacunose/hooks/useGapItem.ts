import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import { mockGapItems } from '../lib/mocks/gapItems';

export function useGapItem(id: string) {
  return useQuery({
    queryKey: ['gapItem', id],
    queryFn: async () => {
      if (isMockMode) return mockGapItems.find(g => g.id === id) || mockGapItems[0];
      const { data, error } = await supabase.from('gap_items').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
