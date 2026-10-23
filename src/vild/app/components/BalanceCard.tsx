import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber, Skeleton } from '../../components/kit';
import { formatDateYear, formatISK } from '../../lib/format';
import { tap } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import type { PocketView } from '../lib/hooks';
import { MerchantMark } from './MerchantMark';

export type BalanceCardProps = {
  total: number;
  earnedTotal: number;
  pockets: PocketView[];
  className?: string;
};

/**
 * The mint balance card: one big number, the lifetime total, then one row
 * per pocket. Reused on the home screen and (compact) on the wallet.
 */
export function BalanceCard({ total, earnedTotal, pockets, className }: BalanceCardProps) {
  const rows = pockets.filter((p) => p.pocket.balance > 0 || p.sector?.status === 'live');
  return (
    <section className={cn('rounded-[22px] bg-[hsl(var(--mint-300))] px-5 pb-4 pt-5 text-[hsl(var(--green-700))]', className)} aria-label="Inneignin þín">
      <p className="vild-eyebrow">Inneignin þín</p>
      <p className="mt-1 text-[44px] font-extrabold leading-none tracking-[-0.03em]" aria-live="polite">
        <AnimatedNumber value={total} />
      </p>
      <p className="mt-2 text-[13px] font-medium text-[hsl(var(--green-600))]">
        Safnað frá upphafi <span className="vild-num font-semibold">{formatISK(earnedTotal)}</span>
      </p>
      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map(({ pocket, merchant, label }) => (
            <li key={pocket.merchantId}>
              <motion.div whileTap={tap}>
                <Link
                  to={href(paths.appMerchant(merchant.slug))}
                  className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 text-foreground transition-colors hover:bg-white/90"
                >
                  <MerchantMark merchant={merchant} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold leading-tight">
                      {label} <span className="font-medium text-muted-foreground">· {merchant.name}</span>
                    </p>
                  </div>
                  <span className="vild-num shrink-0 text-[15px] font-bold">{formatISK(pocket.balance)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </motion.div>
            </li>
          ))}
        </ul>
      )}
      {rows.some((r) => r.pocket.expiring && r.pocket.expiring.amount > 0) && (
        <p className="mt-3 px-1 text-[12px] font-medium text-[hsl(var(--green-600))]">
          {rows
            .filter((r) => r.pocket.expiring && r.pocket.expiring.amount > 0)
            .map((r) => `${formatISK(r.pocket.expiring!.amount)} rennur út ${formatDateYear(r.pocket.expiring!.at)}${rows.length > 1 ? ` (${r.label})` : ''}`)
            .join(' · ')}
        </p>
      )}
    </section>
  );
}

export function BalanceCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[22px] bg-[hsl(var(--mint-100))] px-5 pb-4 pt-5', className)} aria-busy="true">
      <Skeleton className="h-3 w-24 bg-white/60" />
      <Skeleton className="mt-3 h-10 w-40 bg-white/60" />
      <Skeleton className="mt-3 h-3 w-36 bg-white/60" />
      <Skeleton className="mt-4 h-14 w-full rounded-2xl bg-white/60" />
    </div>
  );
}
