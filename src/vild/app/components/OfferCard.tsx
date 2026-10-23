import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Chip, CreditTag, ProductImage, Skeleton } from '../../components/kit';
import { tap } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import type { Offer } from '../../lib/types';
import { offerCreditText } from '../lib/labels';

/** Wide card: picture left (96px), title, one line of body, tag chip. */
export function OfferCard({ offer, className }: { offer: Offer; className?: string }) {
  const credit = offerCreditText(offer);
  return (
    <motion.div whileTap={tap} className={className}>
      <Link to={href(paths.appOffer(offer.id))} className="flex gap-3 rounded-2xl border border-border bg-white p-3 transition-colors hover:bg-secondary/50">
        <ProductImage src={offer.image} name={offer.title} className="h-24 w-24 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[15px] font-bold leading-snug tracking-[-0.01em]">{offer.title}</p>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">{offer.body}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {credit && <CreditTag size="sm">{credit}</CreditTag>}
            {offer.tag && <Chip tone="mint" className="h-6 text-[11px]">{offer.tag}</Chip>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-white p-3" aria-busy="true">
      <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
      <div className="flex-1 py-1">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-2 h-3 w-3/5" />
        <Skeleton className="mt-5 h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
