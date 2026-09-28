import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate } from '../../lib/format';
import { href } from '../../lib/paths';
import { useRatingsForUser } from '../../lib/queries';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { ListSkeleton } from './bits';

/** Five 14px stars for one rating's score (filled ≤ score). */
export function ScoreStars({ score, className }: { score: number; className?: string }) {
  const t = useT();
  return (
    <span role="img" aria-label={t('account.ratings.scoreAria', { score })} className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('h-3.5 w-3.5', i <= score ? 'fill-foreground text-foreground' : 'fill-transparent text-border')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export type RatingsListProps = {
  userId: string;
  /** The signed-in user looking at their own ratings (changes the empty-state copy). */
  own?: boolean;
};

/** Ratings received by a user, newest first: rater avatar + name, score stars, date, comment. */
export function RatingsList({ userId, own = false }: RatingsListProps) {
  const t = useT();
  const [locale] = useLocale();
  const query = useRatingsForUser(userId);

  if (query.isPending) return <ListSkeleton rows={2} />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return <EmptyState icon={Star} title={t('rating.none')} body={t(own ? 'account.ratings.emptyBodyOwn' : 'account.ratings.emptyBody')} />;
  }
  return (
    <ul className="mt-panel divide-y divide-border">
      {query.data.map((rating) => (
        <li key={rating.id} className="flex gap-3 p-4" data-testid="rating-row">
          <UserAvatar profile={rating.rater} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to={href(`/notendur/${rating.rater.id}`)} className="text-[13px] font-semibold underline-offset-2 hover:underline">
                {rating.rater.display_name}
              </Link>
              <VerifiedBadge level={rating.rater.verification} />
              <ScoreStars score={rating.score} />
              <time dateTime={rating.created_at} className="text-[12px] tabular-nums text-muted-foreground">
                {formatDate(rating.created_at, locale)}
              </time>
            </div>
            {rating.comment && <p className="mt-1 whitespace-pre-line text-[13px]">{rating.comment}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
