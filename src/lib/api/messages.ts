import { supabase, requireUid } from '../supabase';
import type { Message } from '../types';

export async function listMessages(dealId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('mt_messages')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(dealId: string, body: string): Promise<Message> {
  const uid = await requireUid();
  const text = body.trim();
  if (!text) throw new Error('INVALID_INPUT');
  const { data, error } = await supabase
    .from('mt_messages')
    .insert({ deal_id: dealId, sender_id: uid, body: text.slice(0, 2000) })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Realtime inserts for a deal's chat. Returns an unsubscribe fn. */
export function subscribeMessages(dealId: string, onInsert: (message: Message) => void): () => void {
  const channel = supabase
    .channel(`mt-messages-${dealId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mt_messages', filter: `deal_id=eq.${dealId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
