import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import { mockSupportThread, mockSupportMessages } from '../lib/mocks/supportThread';
import { fetchApi } from '../lib/api/client';

export function useSupportThread() {
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isMockMode) {
      setThread(mockSupportThread);
      setMessages(mockSupportMessages);
      return;
    }

    (async () => {
      // This endpoint supposedly returns active thread or creates one.
      // But the prompt says "GET /v1/support/thread to fetch active thread (backend auto-creates if none)."
      // Wait, let's just assume fetchApi('/v1/support/thread') returns { thread, messages }
      try {
        const { thread, messages } = await fetchApi('/v1/support/thread');
        setThread(thread);
        setMessages(messages || []);
      } catch (e) {
        // Fallback or error handling
      }
    })();
  }, []);

  useEffect(() => {
    if (!thread || isMockMode) return;
    const channel = supabase.channel(`support_${thread.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${thread.id}` }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [thread?.id]);

  const sendMessage = async (body: string) => {
    const tempId = `temp-${Date.now()}`;
    const newMsg = { id: tempId, thread_id: thread?.id, is_user: true, body, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, newMsg]);
    setSendingIds(prev => new Set(prev).add(tempId));

    if (isMockMode) {
      await new Promise(r => setTimeout(r, 1000));
      setSendingIds(prev => { const n = new Set(prev); n.delete(tempId); return n; });
      return;
    }

    try {
      const res = await fetchApi('/v1/support/messages', {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      // Backend returns { message, thread } per SendSupportMessageResponse.
      const serverMsg = res?.message ?? res;
      if (!thread && res?.thread) setThread(res.thread);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...serverMsg } : m));
    } catch (e) {
      console.error(e);
      // Drop the optimistic bubble on error so the user sees it failed.
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSendingIds(prev => { const n = new Set(prev); n.delete(tempId); return n; });
    }
  };

  return { thread, messages, sendMessage, sendingIds };
}
