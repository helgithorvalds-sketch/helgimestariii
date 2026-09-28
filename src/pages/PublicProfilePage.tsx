import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Flag, Pencil, Tag, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { formatMonthYear, formatNumber, formatTickets } from '../lib/format';
import { href } from '../lib/paths';
import { usePublicProfile, useUserListings } from '../lib/queries';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { ListingWithEvent } from '../lib/types';
import { PageContainer } from '../components/layout/PageContainer';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Money } from '../components/common/Money';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { PriceDelta } from '../components/common/PriceDelta';
import { RatingStars } from '../components/common/RatingStars';
import { ReportDialog } from '../components/common/ReportDialog';
import { UserAvatar } from '../components/common/UserAvatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { secondaryButtonClass } from '../components/common/buttonClasses';
import { RatingsList } from '../components/account/RatingsList';
import { EventLine, ListSkeleton } from '../components/account/bits';
import { ratingsCountKey } from '../components/account/logic';

const smallButton = 'h-10 text-[13px] sm:h-9';

function UserListings({ userId, name }: { userId: string; name: string }) {
  const t = useT();
  const [locale] = useLocale();
  const query = useUserListings(userId);

  if (query.isPending) return <ListSkeleton rows={2} />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return <EmptyState icon={Tag} title={t('account.publicProfile.noListings')} body={t('account.publicProfile.noListingsBody', { name })} />;
  }
  return (
    <ul className="mt-panel divide-y divide-border">
      {query.data.map((listing: ListingWithEvent) => (
        <li key={listing.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4" data-testid="user-listing-row">
          <EventLine event={listing.event} />
          <span className="text-[12px] tabular-nums text-muted-foreground">{formatTickets(listing.quantity_remaining, locale)}</span>
          <div className="flex flex-col items-end">
            <Money amount={listing.asking_price} plain className="text-[14px] font-semibold" />
            <span className="text-[11px] text-muted-foreground">
              <PriceDelta asking={listing.asking_price} face={listing.face_value} short /> · {t('account.publicProfile.perTicket')}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** /notendur/:userId — public profile: header, stats, active listings, ratings received, report user. */
export default function PublicProfilePage() {
  const t = useT();
  const [locale] = useLocale();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const query = usePublicProfile(userId);
  const [reportOpen, setReportOpen] = useState(false);
  const profile = query.data ?? null;
  useDocumentTitle(profile?.display_name ?? null);

  if (query.isPending) {
    return (
      <PageContainer className="py-6">
        <PageSkeleton />
      </PageContainer>
    );
  }
  if (query.isError) {
    return (
      <PageContainer className="py-6">
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </PageContainer>
    );
  }
  if (!profile) {
    return (
      <PageContainer className="py-6">
        <EmptyState
          icon={UserX}
          title={t('account.publicProfile.notFound')}
          body={t('account.publicProfile.notFoundBody')}
          action={
            <Button asChild variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)}>
              <Link to={href('/')}>{t('common.goHome')}</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const isMe = user?.id === profile.id;
  const stats = [
    { label: t('account.publicProfile.sales'), value: profile.sales_count },
    { label: t('account.publicProfile.purchases'), value: profile.purchases_count },
    { label: t('account.publicProfile.ratings'), value: profile.rating_count },
  ];

  return (
    <PageContainer className="py-6">
      {profile.is_banned && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-card p-3 text-[13px]">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-down" aria-hidden="true" />
          <p>{t('account.publicProfile.banned')}</p>
        </div>
      )}

      <header className="mt-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <UserAvatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">{profile.display_name}</h1>
              <VerifiedBadge level={profile.verification} showUnverified long />
              {isMe && <span className="mt-tag">{t('account.publicProfile.thisIsYou')}</span>}
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t('account.publicProfile.memberSince', { date: formatMonthYear(profile.created_at, locale) })}
            </p>
            <div className="mt-2">
              <RatingStars value={profile.rating_avg} count={profile.rating_count} size="lg" />
            </div>
            {profile.bio && (
              <p className="mt-3 max-w-prose whitespace-pre-line text-[13px]" aria-label={t('account.publicProfile.about', { name: profile.display_name })}>
                {profile.bio}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <Button asChild variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)}>
                <Link to={href('/eg')}>
                  <Pencil aria-hidden="true" />
                  {t('account.publicProfile.editProfile')}
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)} onClick={() => setReportOpen(true)}>
                <Flag aria-hidden="true" />
                {t('account.publicProfile.report')}
              </Button>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-[12px] text-muted-foreground">{s.label}</dt>
              <dd className="text-[22px] font-semibold leading-tight tracking-tight tabular-nums">{formatNumber(s.value, locale)}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-6" aria-labelledby="mt-user-listings-title">
        <h2 id="mt-user-listings-title" className="mb-3 text-[14px] font-semibold">
          {t('account.publicProfile.activeListings')}
        </h2>
        <UserListings userId={profile.id} name={profile.display_name} />
      </section>

      <section className="mt-6" aria-labelledby="mt-user-ratings-title">
        <h2 id="mt-user-ratings-title" className="mb-3 text-[14px] font-semibold">
          {t('account.publicProfile.ratings')}{' '}
          <span className="font-normal tabular-nums text-muted-foreground">
            ({t(ratingsCountKey(profile.rating_count, locale), { count: profile.rating_count })})
          </span>
        </h2>
        <RatingsList userId={profile.id} />
      </section>

      {!isMe && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} target={{ userId: profile.id }} contextLabel={profile.display_name} />
      )}
    </PageContainer>
  );
}
