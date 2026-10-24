import { cn } from '@/lib/utils';
import { CoinMark, Wordmark } from '../../components/brand';
import { AnimatedNumber } from '../../components/kit';

export type CardVisualProps = {
  holderName: string;
  balance: number;
  /** "Hádegið · Lúna" */
  pocketLabel?: string;
  className?: string;
  /** Smaller type for the onboarding preview. */
  compact?: boolean;
};

/**
 * The wallet card: deep green, a quiet ring pattern (pure CSS), the coin,
 * the wordmark, the holder's name and the balance in mint. Credit-card ratio.
 */
export function CardVisual({ holderName, balance, pocketLabel, className, compact = false }: CardVisualProps) {
  return (
    <div
      className={cn('vild-dark relative aspect-[1.586] w-full overflow-hidden rounded-[22px] bg-[hsl(var(--green-900))] text-white shadow-[var(--shadow-lg)]', className)}
      style={{
        backgroundImage:
          'radial-gradient(circle at 88% 18%, transparent 0 54px, hsl(106 100% 80% / 0.14) 55px 57px, transparent 58px 92px, hsl(106 100% 80% / 0.10) 93px 95px, transparent 96px 130px, hsl(106 100% 80% / 0.07) 131px 133px, transparent 134px 170px, hsl(106 100% 80% / 0.05) 171px 173px, transparent 174px)',
      }}
      role="img"
      aria-label={`VILD kort, ${holderName}`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" aria-hidden="true" />
      <div className={cn('flex h-full flex-col justify-between', compact ? 'p-4' : 'p-5')}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <CoinMark size={compact ? 26 : 32} />
            <Wordmark size={compact ? 'sm' : 'md'} className="text-white" />
          </div>
          {pocketLabel && <span className="vild-eyebrow !text-[hsl(var(--mint-300))]">{pocketLabel}</span>}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="vild-eyebrow !text-white/60">Nafn</p>
            <p className={cn('truncate font-semibold', compact ? 'text-[14px]' : 'text-[16px]')}>{holderName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="vild-eyebrow !text-white/60">Inneign</p>
            <p className={cn('font-extrabold leading-none tracking-[-0.03em] text-[hsl(var(--mint-300))]', compact ? 'text-[24px]' : 'text-[32px]')} aria-live="polite">
              <AnimatedNumber value={balance} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
