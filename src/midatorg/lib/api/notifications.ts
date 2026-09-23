import { supabase, requireUid } from '../supabase';
import type { Notification } from '../types';

export async function listNotifications(limit = 50): Promise<Notification[]> {
  await requireUid();
  const { data, error } = await supabase
    .from('mt_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function unreadCount(): Promise<number> {
  await requireUid();
  const { count, error } = await supabase
    .from('mt_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('mt_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const uid = await requireUid();
  const { error } = await supabase
    .from('mt_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', uid)
    .is('read_at', null);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('mt_notifications').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Realtime inserts for the signed-in user's notifications. Pass `userId` to
 * filter server-side (RLS already scopes rows). Returns an unsubscribe fn.
 */
export function subscribeNotifications(onInsert: (n: Notification) => void, userId?: string): () => void {
  const channel = supabase
    .channel(`mt-notifications-${userId ?? 'me'}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mt_notifications',
        ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
      },
      (payload) => onInsert(payload.new as Notification),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
