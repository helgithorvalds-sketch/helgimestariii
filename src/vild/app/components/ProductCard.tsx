import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Chip, CreditTag, ProductImage, Skeleton } from '../../components/kit';
import { formatISK, formatSignedISK } from '../../lib/format';
import { tap } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import type { Product } from '../../lib/types';

/**
 * One product: 4:5 photo with the credit tag over it, name, price.
 * `variant="carousel"` is the 160px card in horizontal rows; `grid` fills a
 * 2-column grid cell. The image carries the shared-element layoutId.
 */
export function ProductCard({ product, variant = 'grid', className, eager = false }: { product: Product; variant?: 'carousel' | 'grid'; className?: string; eager?: boolean }) {
  const hasCredit = product.creditAmount > 0;
  return (
    <motion.div whileTap={tap} className={cn(variant === 'carousel' && 'w-[160px] shrink-0 snap-start', className)}>
      <Link to={href(paths.appProduct(product.id))} className="block" aria-label={`${product.name}, ${formatISK(product.price)}${hasCredit ? `, ${formatSignedISK(product.creditAmount)} til baka` : ''}`}>
        <motion.div layoutId={`product-${product.id}`} className="relative aspect-[4/5] overflow-hidden rounded-2xl">
          <ProductImage src={product.image} name={product.name} className="h-full w-full" eager={eager} />
          <div className="absolute bottom-2 left-2">
            {hasCredit ? <CreditTag size="md">{formatSignedISK(product.creditAmount)}</CreditTag> : <Chip tone="outline" className="h-6 bg-white/90 text-[11px] text-muted-foreground">Engin inneign</Chip>}
          </div>
        </motion.div>
        <p className="mt-2 truncate text-[15px] font-semibold leading-tight">{product.name}</p>
        <p className="vild-num mt-0.5 text-[13px] font-medium text-muted-foreground">{formatISK(product.price)}</p>
      </Link>
    </motion.div>
  );
}

export function ProductCardSkeleton({ variant = 'grid' }: { variant?: 'carousel' | 'grid' }) {
  return (
    <div className={cn(variant === 'carousel' && 'w-[160px] shrink-0')} aria-busy="true">
      <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-1.5 h-3 w-1/3" />
    </div>
  );
}

/** Two columns, 12px gutter. */
export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-5', className)}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
