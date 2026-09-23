import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarX2, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDateTime } from '../../lib/format';
import { href } from '../../lib/paths';
import { useAdminEvents, useDeleteEvent } from '../../lib/queries';
import type { EventStatus, MarketEvent } from '../../lib/types';
import { CategoryBadge } from '../common/CategoryBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { UserAvatar } from '../common/UserAvatar';
import { useDebouncedValue } from './adminQueries';
import { AdminSearch, Pill, RowsSkeleton, tdClass, thClass, type PillTone } from './AdminBits';
import { EventEditDialog } from './EventEditDialog';

const STATUS_TONE: Record<EventStatus, PillTone> = { upcoming: 'up', past: 'muted', cancelled: 'down' };

/** Events tab: search, table (title / date / venue / category / status / source / listings), edit dialog, delete with confirm. */
export function EventsTable() {
  const t = useT();
  const [locale] = useLocale();
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q);
  const events = useAdminEvents(query);
  const remove = useDeleteEvent();
  const [editing, setEditing] = useState<MarketEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<MarketEvent | null>(null);

  const openEdit = (e: MarketEvent) => {
    setEditing(e);
    setEditOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t('admin.events.deletedToast'));
        setDeleting(null);
      },
    });
  };

  return (
    <section className="space-y-3" aria-label={t('admin.tab.events')}>
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearch
          id="mt-admin-event-search"
          label={t('admin.events.searchLabel')}
          placeholder={t('admin.events.searchPlaceholder')}
          value={q}
          onChange={setQ}
          className="w-full sm:max-w-sm"
        />
        {events.data && <p className="text-[12px] tabular-nums text-muted-foreground">{t('admin.count', { count: events.data.length })}</p>}
      </div>

      {events.isPending ? (
        <RowsSkeleton />
      ) : events.isError ? (
        <ErrorState error={events.error} retry={() => void events.refetch()} />
      ) : events.data.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={t('admin.events.empty')}
          body={t('admin.events.emptyBody')}
          action={
            q && (
              <Button type="button" variant="outline" size="sm" onClick={() => setQ('')}>
                {t('admin.users.clearSearch')}
              </Button>
            )
          }
        />
      ) : (
        <div className="mt-panel overflow-hidden">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className={thClass}>{t('admin.events.col.title')}</TableHead>
                <TableHead className={thClass}>{t('admin.events.col.date')}</TableHead>
                <TableHead className={thClass}>{t('admin.events.col.venue')}</TableHead>
                <TableHead className={thClass}>{t('admin.events.col.category')}</TableHead>
                <TableHead className={thClass}>{t('admin.events.col.status')}</TableHead>
                <TableHead className={thClass}>{t('admin.events.col.source')}</TableHead>
                <TableHead className={cn(thClass, 'text-right')}>{t('admin.events.col.listings')}</TableHead>
                <TableHead className={cn(thClass, 'text-right')}>{t('admin.events.col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.data.map((e) => (
                <TableRow key={e.id} className="border-border hover:bg-surface-2/40" data-testid="event-row">
                  <TableCell className={tdClass}>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar profile={{ id: e.id, display_name: e.title, avatar_url: e.image_url }} size="sm" shape="square" />
                      <div className="min-w-0">
                        <Link
                          to={href('/vidburdir/' + e.id)}
                          className="line-clamp-2 max-w-[320px] font-semibold text-foreground underline-offset-2 hover:underline"
                          title={t('admin.events.open')}
                        >
                          {e.title}
                        </Link>
                        {e.tix_url && (
                          <a
                            href={e.tix_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            {t('common.seeOnTix')}
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>{formatDateTime(e.starts_at, locale)}</TableCell>
                  <TableCell className={tdClass}>
                    <p className="max-w-[180px] truncate">{e.venue_name ?? '—'}</p>
                    {e.city && <p className="text-[11.5px] text-muted-foreground">{e.city}</p>}
                  </TableCell>
                  <TableCell className={tdClass}>
                    <CategoryBadge category={e.category} />
                  </TableCell>
                  <TableCell className={tdClass}>
                    <Pill tone={STATUS_TONE[e.status]}>{t(`eventStatus.${e.status}`)}</Pill>
                  </TableCell>
                  <TableCell className={cn(tdClass, 'text-muted-foreground')}>{t(`admin.events.source.${e.source}`)}</TableCell>
                  <TableCell className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                    {t('admin.events.listingsCell', { listings: e.listings_active ?? 0, tickets: e.tickets_available ?? 0 })}
                  </TableCell>
                  <TableCell className={cn(tdClass, 'text-right')}>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`${t('admin.events.edit')}: ${e.title}`} onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-down hover:text-down"
                        aria-label={`${t('admin.events.delete')}: ${e.title}`}
                        onClick={() => setDeleting(e)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EventEditDialog event={editing} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('admin.events.deleteTitle', { title: deleting?.title ?? '' })}
        description={t('admin.events.deleteDescription')}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
