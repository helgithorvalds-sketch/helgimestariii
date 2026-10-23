import { cn } from '@/lib/utils';
import type { Merchant } from '../../lib/types';

/**
 * The chain's placeholder mark: a disc in the brand colour with its 1–2
 * letter logoText. Used in pocket rows, pins, history and place lists.
 */
export function MerchantMark({ merchant, size = 40, className }: { merchant: Pick<Merchant, 'logoText' | 'brandColor' | 'name'>; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white', className)}
      style={{ width: size, height: size, background: merchant.brandColor, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {merchant.logoText}
    </span>
  );
}

/** Initials disc in a soft tint (places in lists, receipts). */
export function InitialsMark({ text, size = 40, tone = 'mint', className }: { text: string; size?: number; tone?: 'mint' | 'neutral' | 'dark'; className?: string }) {
  const tones = {
    mint: 'bg-[hsl(var(--mint-100))] text-[hsl(var(--green-700))]',
    neutral: 'bg-secondary text-foreground',
    dark: 'bg-foreground text-[hsl(var(--mint-300))]',
  };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold', tones[tone], className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {text}
    </span>
  );
}
