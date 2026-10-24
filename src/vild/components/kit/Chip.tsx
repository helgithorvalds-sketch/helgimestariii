import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChipTone = 'neutral' | 'mint' | 'green' | 'yellow' | 'dark' | 'outline';

const TONES: Record<ChipTone, string> = {
  neutral: 'bg-secondary text-foreground',
  mint: 'bg-[hsl(var(--mint-100))] text-[hsl(var(--green-700))]',
  green: 'bg-[hsl(var(--green-500))] text-white',
  yellow: 'bg-[hsl(var(--yellow))] text-[hsl(var(--yellow-ink))]',
  dark: 'bg-foreground text-white',
  outline: 'bg-white text-foreground border border-border',
};

/** Static pill: category, tag, status. */
export function Chip({ tone = 'neutral', className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return <span className={cn('inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-semibold leading-none', TONES[tone], className)}>{children}</span>;
}

/** Selectable pill (filters). */
export function ChipButton({ selected, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium transition-colors duration-150',
        selected ? 'border-foreground bg-foreground text-white' : 'border-border bg-white text-foreground hover:bg-secondary',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** "+1.495 kr." in the marker yellow, the credit amount everywhere. */
export function CreditTag({ children, className, size = 'md' }: { children: ReactNode; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-6 px-2 text-[12px]', md: 'h-7 px-2.5 text-[13px]', lg: 'h-9 px-3 text-[15px]' }[size];
  return <span className={cn('vild-num inline-flex items-center rounded-full bg-[hsl(var(--yellow))] font-bold text-[hsl(var(--yellow-ink))]', s, className)}>{children}</span>;
}
