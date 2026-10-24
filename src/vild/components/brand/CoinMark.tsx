import { cn } from '@/lib/utils';

/**
 * The VILD coin: a mint disc with an inner ring and a bold V — the mark from
 * the pitch film, used for the app icon, pins and the balance card.
 */
export function CoinMark({ className, size = 32, title }: { className?: string; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn('shrink-0', className)} role={title ? 'img' : 'presentation'} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <circle cx="32" cy="32" r="32" fill="#B4FF9B" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#0C5C3B" strokeWidth="2.5" />
      <path d="M19 21h8l5 16 5-16h8L37 45h-10z" fill="#0C5C3B" />
    </svg>
  );
}

/** Dark variant: green disc, mint V. For dark surfaces. */
export function CoinMarkDark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn('shrink-0', className)} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#0C5C3B" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#B4FF9B" strokeWidth="2.5" />
      <path d="M19 21h8l5 16 5-16h8L37 45h-10z" fill="#B4FF9B" />
    </svg>
  );
}

/** The end-card mark: a circular arrow wrapping a V. */
export function LoopMark({ className, size = 48, color = '#0C5C3B' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn('shrink-0', className)} aria-hidden="true">
      <path d="M32 8a24 24 0 1 1-17 7" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <path d="M12 6v12h12" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 24h6l4 13 4-13h6l-7 20h-6z" fill={color} />
    </svg>
  );
}
