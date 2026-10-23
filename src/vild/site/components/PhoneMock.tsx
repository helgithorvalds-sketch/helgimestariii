import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, MapPin, Receipt, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber, Chip, CreditTag, ProductImage } from '../../components/kit';
import { formatISK, formatSignedISK } from '../../lib/format';
import { springSoft } from '../../lib/motion';
import type { Product } from '../../lib/types';

/** What the phone shows when the catalogue has not loaded yet: the three products the film uses. */
const FALLBACK: Pick<Product, 'id' | 'name' | 'price' | 'image' | 'creditAmount'>[] = [
  { id: 'p_margherita', name: 'Margherita', price: 2990, image: '/vild/img/products/margherita.jpg', creditAmount: 1495 },
  { id: 'p_chicken_salad', name: 'Kjúklingasalat', price: 2690, image: '/vild/img/products/chicken-salad.jpg', creditAmount: 672 },
  { id: 'p_luna_burger', name: 'Lúnuborgari', price: 2890, image: '/vild/img/products/burger.jpg', creditAmount: 578 },
];

const TABS = [
  { icon: Home, label: 'Heim', active: true },
  { icon: MapPin, label: 'Staðir' },
  { icon: Wallet, label: 'Kort' },
  { icon: Receipt, label: 'Yfirlit' },
  { icon: User, label: 'Ég' },
];

/**
 * A faithful, static render of the app home inside a phone frame, built from
 * the kit so it is real UI. 300 × 620 at full size; scaled down on phones.
 */
export function PhoneMock({ products, balance = 2340, className, tilt = -4 }: { products?: Product[]; balance?: number; className?: string; tilt?: number }) {
  const shown = (products && products.length >= 3 ? products.filter((p) => p.creditAmount > 0).slice(0, 3) : FALLBACK).slice(0, 3);
  // Count up from zero once the phone has risen in.
  const [shownBalance, setShownBalance] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setShownBalance(balance), 450);
    return () => window.clearTimeout(t);
  }, [balance]);
  return (
    <motion.div
      className={cn('relative h-[496px] w-[240px] sm:h-[620px] sm:w-[300px]', className)}
      initial={{ opacity: 0, y: 48, rotate: tilt }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      transition={{ ...springSoft, delay: 0.15 }}
      aria-hidden="true"
    >
      <div className="absolute left-0 top-0 h-[620px] w-[300px] origin-top-left scale-[0.8] sm:scale-100">
        <div className="h-full w-full rounded-[44px] bg-[hsl(var(--ink))] p-[10px] shadow-[var(--shadow-lg)]">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[34px] bg-[hsl(var(--surface-2))] text-foreground">
            {/* status bar */}
            <div className="flex items-center justify-between px-6 pt-3 text-[12px] font-semibold">
              <span className="vild-num">12:40</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-foreground/70" />
                <span className="h-2 w-2 rounded-full bg-foreground/70" />
                <span className="h-2.5 w-5 rounded-[3px] border border-foreground/70" />
              </span>
            </div>

            {/* greeting */}
            <div className="px-5 pt-5">
              <p className="text-[12px] font-medium text-muted-foreground">Fimmtudagur</p>
              <p className="text-[24px] font-extrabold leading-tight tracking-[-0.025em]">Hæ Helgi</p>
            </div>

            {/* balance card */}
            <div className="mx-4 mt-4 rounded-2xl bg-[hsl(var(--mint-300))] p-4 text-[hsl(var(--green-900))]">
              <p className="text-[12px] font-semibold text-[hsl(var(--green-700))]">Inneignin þín</p>
              <AnimatedNumber value={shownBalance} className="mt-0.5 block text-[34px] font-extrabold leading-none tracking-[-0.03em]" duration={1100} />
              <div className="mt-3 flex items-center justify-between">
                <Chip tone="dark" className="bg-[hsl(var(--green-900))]">Hádegið · Lúna</Chip>
                <span className="text-[12px] font-medium text-[hsl(var(--green-700))]">Gildir í 24 mán.</span>
              </div>
            </div>

            {/* products */}
            <div className="mt-5 flex items-end justify-between px-5">
              <p className="text-[15px] font-bold tracking-tight">Krónur til baka í dag</p>
              <span className="text-[12px] font-semibold text-[hsl(var(--green-500))]">Sjá allt</span>
            </div>
            <div className="no-scrollbar mt-3 flex gap-3 overflow-hidden pl-4">
              {shown.map((p) => (
                <div key={p.id} className="w-[124px] shrink-0">
                  <div className="relative">
                    <ProductImage src={p.image} name={p.name} className="aspect-[4/5] rounded-xl" />
                    <CreditTag size="sm" className="absolute bottom-2 left-2">
                      {formatSignedISK(p.creditAmount)}
                    </CreditTag>
                  </div>
                  <p className="mt-2 truncate text-[13px] font-semibold leading-tight">{p.name}</p>
                  <p className="vild-num text-[12px] text-muted-foreground">{formatISK(p.price)}</p>
                </div>
              ))}
            </div>

            {/* tab bar */}
            <div className="mt-auto flex h-[64px] items-start justify-around border-t border-border bg-white px-2 pt-2.5">
              {TABS.map(({ icon: Icon, label, active }) => (
                <span key={label} className={cn('flex w-12 flex-col items-center gap-1 text-[10px]', active ? 'font-semibold text-[hsl(var(--green-500))]' : 'font-medium text-muted-foreground')}>
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
