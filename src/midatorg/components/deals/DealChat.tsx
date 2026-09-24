import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { formatDateTime, formatNumber, formatRelative } from '../../lib/format';
import { useMessages, useSendMessage } from '../../lib/queries';
import type { DealStatus, DealWithContext, Message } from '../../lib/types';
import { ErrorState } from '../common/ErrorState';
import { MAX_MESSAGE_LENGTH, chatClosedKey } from './dealState';

type DealChatProps = {
  deal: DealWithContext;
  /** Effective status (a stale reservation reads as expired). */
  status: DealStatus;
  /** The signed-in user (decides which side a bubble sits on). */
  userId: string;
  className?: string;
};

function Bubble({ message, own, name, showName }: { message: Message; own: boolean; name: string; showName: boolean }) {
  const t = useT();
  return (
    <li className={cn('flex max-w-[85%] flex-col', own ? 'items-end self-end' : 'items-start self-start')} data-own={own || undefined}>
      {showName && <span className="mb-0.5 px-1 text-[11px] text-muted-foreground">{name}</span>}
      <p
        className={cn(
          'whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-[13px] leading-[1.45]',
          own ? 'border-transparent bg-accent text-foreground' : 'border-transparent bg-secondary text-foreground',
        )}
      >
        {message.body}
      </p>
      <time
        dateTime={message.created_at}
        title={formatDateTime(message.created_at)}
        aria-label={t('deals.chat.sentAt', { time: formatDateTime(message.created_at) })}
        className="mt-0.5 px-1 text-[11px] tabular-nums text-muted-foreground"
      >
        {formatRelative(message.created_at)}
      </time>
    </li>
  );
}

/**
 * Realtime chat for a deal: `useMessages` (list + subscribeMessages) and
 * `useSendMessage`. Enter sends, Shift+Enter breaks the line, 2000 chars max.
 * The composer is replaced by an explanation when the deal is cancelled/expired
 * or the viewer is banned (the server rejects those inserts anyway).
 */
export function DealChat({ deal, status, userId, className }: DealChatProps) {
  const t = useT();
  const { isBanned } = useAuth();
  const messagesQ = useMessages(deal.id);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const closedKey = chatClosedKey(status) ?? (isBanned ? 'deals.chat.closed.banned' : null);
  const items = messagesQ.data ?? [];
  const count = items.length;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const nameOf = (senderId: string): string => {
    if (senderId === userId) return t('common.you');
    if (senderId === deal.buyer.id) return deal.buyer.display_name;
    if (senderId === deal.seller.id) return deal.seller.display_name;
    return t('deals.chat.admin');
  };

  const submit = () => {
    const body = text.trim();
    if (!body || send.isPending || closedKey) return;
    send.mutate({ dealId: deal.id, body }, { onSuccess: () => setText('') });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section className={cn('mt-panel flex flex-col overflow-hidden', className)} aria-labelledby="mt-chat-title">
      <div className="flex items-center gap-2 border-b border-border px-[14px] py-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="mt-chat-title" className="text-sm font-semibold">
          {t('deals.chat.title')}
        </h2>
      </div>
      <p className="flex items-start gap-2 border-b border-border bg-secondary px-[14px] py-2 text-[12px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" aria-hidden="true" />
        <span>{t('deals.chat.pinned')}</span>
      </p>

      <div ref={listRef} className="max-h-[440px] min-h-[220px] flex-1 overflow-y-auto p-[14px]" data-testid="chat-scroll">
        {messagesQ.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-9 w-2/3 bg-secondary" />
            <Skeleton className="ml-auto h-9 w-1/2 bg-secondary" />
            <Skeleton className="h-9 w-3/5 bg-secondary" />
          </div>
        ) : messagesQ.isError ? (
          <ErrorState error={messagesQ.error} retry={() => void messagesQ.refetch()} />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground" role="status">
            {t('deals.chat.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2" role="log" aria-live="polite" aria-relevant="additions">
            {items.map((m, i) => {
              const own = m.sender_id === userId;
              const showName = !own && items[i - 1]?.sender_id !== m.sender_id;
              return <Bubble key={m.id} message={m} own={own} name={nameOf(m.sender_id)} showName={showName} />;
            })}
          </ul>
        )}
      </div>

      <form
        className="border-t border-border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {closedKey ? (
          <p className="text-[13px] text-muted-foreground" role="status">
            {t(closedKey)}
          </p>
        ) : (
          <>
            <Label htmlFor="mt-chat-input" className="sr-only">
              {t('deals.chat.label')}
            </Label>
            <div className="flex items-end gap-2">
              <Textarea
                id="mt-chat-input"
                rows={1}
                value={text}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyDown={onKeyDown}
                placeholder={t('deals.chat.placeholder')}
                disabled={send.isPending}
                className="max-h-32 min-h-[40px] flex-1 resize-none bg-background text-[13px]"
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label={t('common.send')}
                disabled={!text.trim() || send.isPending}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground" aria-live="off">
              {t('deals.chat.counter', { count: formatNumber(text.length), max: formatNumber(MAX_MESSAGE_LENGTH) })}
            </p>
          </>
        )}
      </form>
    </section>
  );
}
