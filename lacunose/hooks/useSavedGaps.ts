import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import { mockGapItems } from '../lib/mocks/gapItems';

export function useSavedGaps() {
  return useQuery({
    queryKey: ['savedGaps'],
    queryFn: async () => {
      if (isMockMode) return mockGapItems.slice(0, 3);
      const { data, error } = await supabase.from('saved_items').select('*, gap_items(*)').order('saved_at', { ascending: false });
      if (error) throw error;
      return data.map((d: any) => d.gap_items);
    }
  });
}
