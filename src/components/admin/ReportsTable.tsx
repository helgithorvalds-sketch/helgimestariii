import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftRight, CalendarDays, Check, Flag, ShieldCheck, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatRelative } from '../../lib/format';
import { href } from '../../lib/paths';
import { useAdminReports, useResolveReport } from '../../lib/queries';
import { REPORT_REASONS, type ReportReason } from '../../lib/constants';
import type { PublicProfile, ReportStatus, ReportWithContext } from '../../lib/types';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { UserAvatar } from '../common/UserAvatar';
import { useListingEventMap } from './adminQueries';
import { Pill, RowsSkeleton, Segmented, type PillTone } from './AdminBits';

type Filter = ReportStatus | 'all';
const FILTERS: Filter[] = ['open', 'resolved', 'dismissed', 'all'];
const STATUS_TONE: Record<ReportStatus, PillTone> = { open: 'down', resolved: 'up', dismissed: 'muted' };

function PersonLink({ profile, fallback }: { profile: PublicProfile | null; fallback: string }) {
  if (!profile) return <span className="text-muted-foreground">{fallback}</span>;
  return (
    <Link
      to={href('/notendur/' + profile.id)}
      className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-2 hover:underline"
    >
      <UserAvatar profile={profile} size={20} />
      {profile.display_name}
    </Link>
  );
}

function ReportRow({
  report,
  eventId,
  onResolve,
  pending,
}: {
  report: ReportWithContext;
  eventId: string | undefined;
  onResolve: (status: Exclude<ReportStatus, 'open'>) => void;
  pending: boolean;
}) {
  const t = useT();
  const [locale] = useLocale();
  const reasonLabel = (REPORT_REASONS as readonly string[]).includes(report.reason)
    ? t(`report.reason.${report.reason as ReportReason}`)
    : report.reason;
  const links: { to: string; label: string; icon: typeof User }[] = [];
  if (report.listing_id && eventId) links.push({ to: href('/vidburdir/' + eventId), label: t('admin.reports.linkEvent'), icon: CalendarDays });
  if (report.reported_user_id) links.push({ to: href('/notendur/' + report.reported_user_id), label: t('admin.reports.linkUser'), icon: User });
  if (report.deal_id) links.push({ to: href('/vidskipti/' + report.deal_id), label: t('admin.reports.linkDeal'), icon: ArrowLeftRight });

  return (
    <li className={cn('mt-panel p-4', report.status !== 'open' && 'opacity-80')} data-testid="report-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Flag className="h-4 w-4 shrink-0 text-down" aria-hidden="true" />
          <h3 className="text-[14px] font-semibold">{reasonLabel}</h3>
          <Pill tone={STATUS_TONE[report.status]}>{t(`admin.reports.badge.${report.status}`)}</Pill>
        </div>
        <p className="text-[12px] tabular-nums text-muted-foreground">
          {report.status === 'open' || !report.resolved_at
            ? t('admin.reports.createdAgo', { ago: formatRelative(report.created_at, locale) })
            : t('admin.reports.handledAgo', { ago: formatRelative(report.resolved_at, locale) })}
        </p>
      </div>

      <p className={cn('mt-2 whitespace-pre-line text-[13px]', report.details ? 'text-foreground' : 'text-muted-foreground')}>
        {report.details || t('admin.reports.noDetails')}
      </p>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-x-2">
          <dt className="text-muted-foreground">{t('admin.reports.reporter')}:</dt>
          <dd>
            <PersonLink profile={report.reporter} fallback={t('admin.reports.unknownUser')} />
          </dd>
        </div>
        {report.reported_user_id && (
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-muted-foreground">{t('admin.reports.reportedUser')}:</dt>
            <dd>
              <PersonLink profile={report.reported_user} fallback={t('admin.reports.unknownUser')} />
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          {links.length > 0 && <span className="text-muted-foreground">{t('admin.reports.target')}:</span>}
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="inline-flex items-center gap-1 py-1 text-foreground underline-offset-2 hover:underline">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
        {report.status === 'open' && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled={pending} onClick={() => onResolve('dismissed')}>
              <X className="h-4 w-4" aria-hidden="true" />
              {t('admin.reports.dismiss')}
            </Button>
            <Button type="button" size="sm" className="h-9 gap-1.5" disabled={pending} onClick={() => onResolve('resolved')}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('admin.reports.resolve')}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Reports tab: filter by status (open first), each report with target links and Leysa / Hafna. */
export function ReportsTable() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>('open');
  const reports = useAdminReports(filter);
  const listingIds = useMemo(
    () => Array.from(new Set((reports.data ?? []).map((r) => r.listing_id).filter((id): id is string => !!id))),
    [reports.data],
  );
  const listingEvents = useListingEventMap(listingIds);
  const resolve = useResolveReport();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onResolve = (id: string, status: Exclude<ReportStatus, 'open'>) => {
    setPendingId(id);
    resolve.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(t(status === 'resolved' ? 'admin.reports.resolvedToast' : 'admin.reports.dismissedToast')),
        onSettled: () => setPendingId(null),
      },
    );
  };

  return (
    <section className="space-y-3" aria-label={t('admin.tab.reports')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented<Filter>
          label={t('admin.reports.filterLabel')}
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ value: f, label: t(`admin.reports.status.${f}`) }))}
        />
        {reports.data && <p className="text-[12px] tabular-nums text-muted-foreground">{t('admin.count', { count: reports.data.length })}</p>}
      </div>

      {reports.isPending ? (
        <RowsSkeleton rows={3} />
      ) : reports.isError ? (
        <ErrorState error={reports.error} retry={() => void reports.refetch()} />
      ) : reports.data.length === 0 ? (
        <EmptyState
          icon={filter === 'open' ? ShieldCheck : Flag}
          title={t(filter === 'open' ? 'admin.reports.emptyOpen' : 'admin.reports.emptyFiltered')}
          body={t(filter === 'open' ? 'admin.reports.emptyOpenBody' : 'admin.reports.emptyFilteredBody')}
          action={
            filter !== 'open' && (
              <Button type="button" variant="outline" size="sm" onClick={() => setFilter('open')}>
                {t('admin.reports.showOpen')}
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {reports.data.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              eventId={r.listing_id ? listingEvents.data?.get(r.listing_id) : undefined}
              onResolve={(status) => onResolve(r.id, status)}
              pending={pendingId === r.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
