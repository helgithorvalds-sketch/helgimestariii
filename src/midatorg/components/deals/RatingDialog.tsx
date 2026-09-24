import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useMyRatingForDeal, useRateDeal } from '../../lib/queries';
import type { DealWithContext } from '../../lib/types';
import { ErrorState } from '../common/ErrorState';
import { MAX_RATING_COMMENT_LENGTH, counterpartOf, type DealRole } from './dealState';

type RatingDialogProps = {
  deal: DealWithContext;
  role: DealRole;
  className?: string;
};

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * "Gefðu X einkunn" panel + dialog with five star buttons and an optional
 * comment. Shown after completion; collapses to a confirmation line once
 * `getMyRatingForDeal` returns a rating.
 */
export function RatingDialog({ deal, role, className }: RatingDialogProps) {
  const t = useT();
  const ratee = counterpartOf(deal, role);
  const myRating = useMyRatingForDeal(deal.id);
  const rate = useRateDeal();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  if (!ratee) return null;

  if (myRating.isPending) {
    return <Skeleton className={cn('h-10 w-full bg-secondary', className)} aria-busy="true" />;
  }
  if (myRating.isError) {
    return <ErrorState error={myRating.error} retry={() => void myRating.refetch()} className={className} />;
  }
  if (myRating.data) {
    return (
      <p className={cn('flex items-center gap-2 text-[13px] text-muted-foreground', className)} role="status" data-testid="rating-done">
        <CheckCircle2 className="h-4 w-4 text-up" aria-hidden="true" />
        {t('deals.rating.done', { score: myRating.data.score })}
      </p>
    );
  }

  const name = ratee.display_name;
  const starLabel = (n: number) => (n === 1 ? t('deals.rating.star.one') : t('deals.rating.star.many', { n }));

  const submit = () => {
    if (score < 1 || rate.isPending) return;
    rate.mutate(
      { dealId: deal.id, score, comment: comment.trim() || null },
      {
        onSuccess: () => {
          toast.success(t('deals.rating.thanks'));
          setOpen(false);
        },
      },
    );
  };

  return (
    <section className={cn('mt-panel p-[14px]', className)} aria-labelledby="mt-rating-title">
      <h2 id="mt-rating-title" className="text-sm font-semibold">
        {t('deals.rating.title', { name })}
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{t('deals.rating.body', { name })}</p>
      <Button type="button" className="mt-3 h-10 text-[13px] font-semibold sm:h-9" onClick={() => setOpen(true)}>
        <Star className="h-4 w-4" aria-hidden="true" />
        {t('deals.rating.open')}
      </Button>

      <Dialog open={open} onOpenChange={rate.isPending ? () => undefined : setOpen}>
        <DialogContent className="mt-panel max-w-md bg-card p-5">
          <DialogHeader>
            <DialogTitle className="text-base">{t('deals.rating.title', { name })}</DialogTitle>
            <DialogDescription className="text-[13px]">{t('deals.rating.body', { name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p id="mt-rating-score-label" className="mb-1.5 text-sm font-medium">
                {t('deals.rating.scoreLabel')}
              </p>
              <div role="radiogroup" aria-labelledby="mt-rating-score-label" className="flex gap-1" onMouseLeave={() => setHover(0)}>
                {SCORES.map((n) => {
                  const filled = n <= (hover || score);
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={score === n}
                      aria-label={starLabel(n)}
                      onClick={() => setScore(n)}
                      onMouseEnter={() => setHover(n)}
                      onFocus={() => setHover(n)}
                      onBlur={() => setHover(0)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-secondary"
                    >
                      <Star className={cn('h-6 w-6', filled ? 'fill-foreground text-foreground' : 'fill-transparent text-border')} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mt-rating-comment">
                {t('deals.rating.comment')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
              </Label>
              <Textarea
                id="mt-rating-comment"
                value={comment}
                maxLength={MAX_RATING_COMMENT_LENGTH}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_RATING_COMMENT_LENGTH))}
                placeholder={t('deals.rating.commentPlaceholder')}
                rows={3}
                className="bg-background text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={rate.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={score < 1 || rate.isPending}>
              {rate.isPending ? t('common.sending') : t('deals.rating.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
