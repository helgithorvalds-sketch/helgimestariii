import { useReducer, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, ChevronRight, Clock, Flag, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { href } from '../lib/paths';
import { mtKeys, useDeal } from '../lib/queries';
import { formatDateTime, formatISK, formatMonthYear, formatRelative, formatTickets, formatTime } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { DealWithContext, PublicProfile } from '../lib/types';
import { Countdown } from '../components/common/Countdown';
import { ErrorState } from '../components/common/ErrorState';
import { Money } from '../components/common/Money';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { RatingStars } from '../components/common/RatingStars';
import { ReportDialog } from '../components/common/ReportDialog';
import { UserAvatar } from '../components/common/UserAvatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { secondaryButtonClass } from '../components/common/buttonClasses';
import { PageContainer } from '../components/layout/PageContainer';
import { DealActions } from '../components/deals/DealActions';
import { DealChat } from '../components/deals/DealChat';
import { DealGuidance } from '../components/deals/DealGuidance';
import { DealStatusBadge, DealStepper } from '../components/deals/DealStepper';
import { ProofDownload } from '../components/deals/ProofDownload';
import { RatingDialog } from '../components/deals/RatingDialog';
import { canRate, counterpartOf, dealTotal, effectiveStatus, roleFor } from '../components/deals/dealState';

type PartyCardProps = {
  profile: PublicProfile;
  heading: string;
  onReport: (profile: PublicProfile) => void;
};

/** Avatar, name → profile, rating, verification, member since, Tilkynna. */
function PartyCard({ profile, heading, onReport }: PartyCardProps) {
  const t = useT();
  const profileHref = href(`/notendur/${profile.id}`);
  return (
    <section className="mt-panel p-[14px]" aria-label={heading} data-testid="party-card">
      <p className="mt-eyebrow">{heading}</p>
      <div className="mt-2 flex items-center gap-3">
        <UserAvatar profile={profile} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Link to={profileHref} className="truncate text-sm font-semibold hover:underline">
              {profile.display_name}
            </Link>
            <VerifiedBadge level={profile.verification} />
            {profile.is_banned && (
              <span className="inline-flex items-center gap-1 text-[11px] text-down">
                <Ban className="h-3 w-3" aria-hidden="true" />
                {t('deals.counterpart.banned')}
              </span>
            )}
          </p>
          <RatingStars value={profile.rating_avg} count={profile.rating_count} />
          <p className="text-[11px] text-muted-foreground">
            {t('deals.counterpart.memberSince', { date: formatMonthYear(profile.created_at) })}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className={secondaryButtonClass}>
          <Link to={profileHref}>{t('deals.counterpart.viewProfile')}</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onReport(profile)}
          aria-label={t('deals.counterpart.reportAria', { name: profile.display_name })}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {t('common.report')}
        </Button>
      </div>
    </section>
  );
}

function NoAccess() {
  const t = useT();
  return (
    <PageContainer className="py-6 sm:py-8">
      <ErrorState title={t('deals.noAccess.title')} body={t('deals.noAccess.body')} />
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link to={href('/vidskipti')}>{t('deals.backToDeals')}</Link>
      </Button>
    </PageContainer>
  );
}

function DealRoom({ deal }: { deal: DealWithContext }) {
  const t = useT();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [reportTarget, setReportTarget] = useState<PublicProfile | null>(null);
  useDocumentTitle(deal.event.title);

  const role = roleFor(deal, user?.id, isAdmin);
  if (role === 'none' || !user) return <NoAccess />;

  const status = effectiveStatus(deal);
  const other = counterpartOf(deal, role);
  const total = dealTotal(deal);
  const listingMeta = [deal.listing.ticket_type, deal.listing.seat_info].filter(Boolean).join(' · ');

  const onExpire = () => {
    bump();
    void qc.invalidateQueries({ queryKey: mtKeys.deal(deal.id) });
    void qc.invalidateQueries({ queryKey: mtKeys.deals });
  };

  return (
    <PageContainer className="py-5 sm:py-8">
      <nav aria-label={t('common.back')} className="mb-3 flex items-center gap-1 text-[12px] text-muted-foreground">
        <Link to={href('/vidskipti')} className="underline-offset-4 hover:text-foreground hover:underline">
          {t('nav.deals')}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="truncate text-foreground">{deal.event.title}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="mt-panel p-[14px]" aria-labelledby="mt-deal-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mt-eyebrow">{t('deals.room.title')}</p>
                <h1 id="mt-deal-title" className="text-[22px] font-bold leading-[1.2] tracking-[-0.025em] sm:text-[26px]">
                  <Link to={href(`/vidburdir/${deal.event.id}`)} className="underline-offset-4 hover:underline">
                    {deal.event.title}
                  </Link>
                </h1>
                <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">
                  {formatDateTime(deal.event.starts_at)}
                  {deal.event.venue_name ? ` · ${deal.event.venue_name}` : ''}
                </p>
                {listingMeta && <p className="text-[13px] text-muted-foreground">{listingMeta}</p>}
                <p className="mt-1 text-[12px] text-muted-foreground">{t('deals.room.created', { ago: formatRelative(deal.created_at) })}</p>
              </div>
              <DealStatusBadge status={status} />
            </div>
            {status === 'reserved' && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-[13px]">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>{t('countdown.reservedUntil', { time: formatTime(deal.reserved_until) })}</span>
                <span className="text-muted-foreground" aria-hidden="true">
                  ·
                </span>
                <span className="mt-eyebrow">{t('deals.timer.label')}</span>
                <Countdown until={deal.reserved_until} className="font-semibold" onExpire={onExpire} />
              </p>
            )}
          </section>

          <DealStepper deal={{ ...deal, status }} />
          <DealGuidance deal={deal} status={status} role={role} />

          <section className="mt-panel p-[14px]" aria-labelledby="mt-amount-title">
            <h2 id="mt-amount-title" className="mt-eyebrow">
              {t('deals.amount.title')}
            </h2>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] tabular-nums text-muted-foreground">
                {t('deals.amount.formula', { quantity: formatTickets(deal.quantity), price: formatISK(deal.price_per_ticket) })}
                <span className="sr-only"> = {t('deals.amount.total')}</span>
              </p>
              <Money amount={total} className="mt-headline" unitClassName="text-[15px]" />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('deals.amount.note')}
            </p>
          </section>

          <DealActions deal={deal} status={status} role={role} isAdmin={isAdmin} />
          <ProofDownload deal={deal} status={status} role={role} />
          {canRate(status, role) && <RatingDialog deal={deal} role={role} />}

          <p className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" aria-hidden="true" />
            <span>{t('deals.room.trust')}</span>
          </p>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          {other ? (
            <PartyCard profile={other} heading={role === 'buyer' ? t('common.seller') : t('common.buyer')} onReport={setReportTarget} />
          ) : (
            <>
              <PartyCard profile={deal.buyer} heading={t('common.buyer')} onReport={setReportTarget} />
              <PartyCard profile={deal.seller} heading={t('common.seller')} onReport={setReportTarget} />
            </>
          )}
          <DealChat deal={deal} status={status} userId={user.id} />
        </aside>
      </div>

      <ReportDialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null);
        }}
        target={{ userId: reportTarget?.id, dealId: deal.id }}
        contextLabel={reportTarget ? `${reportTarget.display_name} · ${deal.event.title}` : deal.event.title}
      />
    </PageContainer>
  );
}

/** /vidskipti/:dealId — stepper, guidance, amount, counterpart, actions, proof, chat, rating (spec §5). */
export default function DealRoomPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const t = useT();
  const dealQ = useDeal(dealId);
  useDocumentTitle(t('deals.room.title'));

  if (dealQ.isPending) {
    return (
      <PageContainer className="py-6 sm:py-8">
        <PageSkeleton />
      </PageContainer>
    );
  }
  if (dealQ.isError) {
    return (
      <PageContainer className="py-6 sm:py-8">
        <ErrorState error={dealQ.error} retry={() => void dealQ.refetch()} />
      </PageContainer>
    );
  }
  if (!dealQ.data) return <NoAccess />;
  return <DealRoom deal={dealQ.data} />;
}
