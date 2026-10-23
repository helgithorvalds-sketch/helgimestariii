import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CreditTag, ProductImage, Skeleton } from '../../components/kit';
import { formatISK, formatSignedISK } from '../../lib/format';
import { fadeUp, staggerParent, tap, useRevealProps } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import type { Product } from '../../lib/types';

const CARD = 'w-[168px] shrink-0 snap-start lg:w-auto';
/* Hover (mouse only): the photo grows 3% inside its clip, the tag lifts 2px. The card itself never scales. */
const HOVER_T = '[transition-duration:400ms] [transition-timing-function:var(--ease-out)]';
const IMG_HOVER = `transition-[opacity,transform] ${HOVER_T} [@media(hover:hover)]:group-hover:scale-[1.03]`;
const TAG_HOVER = `transition-transform ${HOVER_T} [@media(hover:hover)]:group-hover:-translate-y-0.5`;

/**
 * Products with credit, as the app shows them: image 4:5, the credit tag on
 * the picture, name and price under it. Horizontal snap row on phones, a
 * four-up grid on desktop. Max eight.
 */
export function ProductCarousel({ products, loading, className }: { products: Product[] | undefined; loading?: boolean; className?: string }) {
  const reveal = useRevealProps();
  const items = (products ?? [])
    .filter((p) => p.creditAmount > 0)
    .sort((a, b) => b.creditPct - a.creditPct || b.creditAmount - a.creditAmount)
    .slice(0, 8);

  const wrap = cn('no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scroll-pl-4 sm:-mx-6 sm:px-6 sm:scroll-pl-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0', className);

  if (loading || !products) {
    return (
      <div className={wrap} aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={CARD}>
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-[15px] text-muted-foreground">Engin inneign í boði núna. Kíktu aftur í hádeginu.</p>;
  }

  return (
    <motion.ul className={wrap} variants={staggerParent(0.06)} {...reveal}>
      {items.map((p) => (
        <motion.li key={p.id} variants={fadeUp} className={CARD}>
          <motion.div whileTap={tap}>
            <Link to={href(paths.appProduct(p.id))} className="group block rounded-2xl" aria-label={`${p.name}, ${formatISK(p.price)}, ${formatSignedISK(p.creditAmount)} til baka`}>
              <div className="relative">
                <ProductImage src={p.image} name={p.name} alt={p.name} className="aspect-[4/5] rounded-2xl" imgClassName={IMG_HOVER} />
                <CreditTag className={cn('absolute bottom-3 left-3', TAG_HOVER)}>{formatSignedISK(p.creditAmount)}</CreditTag>
              </div>
              <p className="mt-3 truncate text-[15px] font-semibold leading-tight transition-colors duration-150 group-hover:text-[hsl(var(--green-500))]">{p.name}</p>
              <p className="vild-num mt-0.5 text-[14px] text-muted-foreground">{formatISK(p.price)}</p>
            </Link>
          </motion.div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
