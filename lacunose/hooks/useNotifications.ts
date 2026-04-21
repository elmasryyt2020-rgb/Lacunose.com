import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (isMockMode) return [
        { id: '1', kind: 'analysis_done', title: 'Analysis complete', body: 'Your gap analysis on GLP-1 is ready.', is_read: false, created_at: new Date().toISOString() }
      ];
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (isMockMode) return;
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return { ...query, markAllRead: markAllRead.mutate };
}
