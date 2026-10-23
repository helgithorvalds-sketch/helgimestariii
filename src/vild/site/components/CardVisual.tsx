import { cn } from '@/lib/utils';
import { CoinMark, Wordmark } from '../../components/brand';
import { formatISK } from '../../lib/format';

/** A fixed 9 × 9 pattern that reads as a QR code without being one. */
const QR = [
  '111111101', '100000101', '101110101', '101110100', '101110111', '100000110', '111111101', '000000010', '110101111',
];

/**
 * The wallet card as it appears under Kort in the app: dark green, the coin,
 * the wordmark, the holder's name, the balance in mint and a code to scan.
 */
export function CardVisual({ name = 'Helgi Þorvaldsson', balance = 2340, pocket = 'Hádegið · Lúna', className }: { name?: string; balance?: number; pocket?: string; className?: string }) {
  return (
    <div className={cn('vild-dark relative aspect-[1.586] w-full max-w-[400px] overflow-hidden rounded-2xl bg-[hsl(var(--green-900))] p-5 text-white shadow-[var(--shadow-lg)] sm:p-6', className)} role="img" aria-label={`VILD-kort: ${name}, inneign ${formatISK(balance)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CoinMark size={32} />
          <Wordmark size="sm" className="text-[hsl(var(--mint-300))]" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--mint-300))]/80">{pocket}</span>
      </div>

      <div className="absolute bottom-5 left-5 sm:bottom-6 sm:left-6">
        <p className="text-[12px] font-medium text-white/70">{name}</p>
        <p className="vild-num mt-1 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[hsl(var(--mint-300))] sm:text-[32px]">{formatISK(balance)}</p>
      </div>

      <div className="absolute bottom-5 right-5 grid grid-cols-9 gap-[2px] rounded-md bg-white p-1.5 sm:bottom-6 sm:right-6" aria-hidden="true">
        {QR.flatMap((row, y) => row.split('').map((cell, x) => <span key={`${x}-${y}`} className={cn('h-[5px] w-[5px] sm:h-[6px] sm:w-[6px]', cell === '1' ? 'bg-[hsl(var(--green-900))]' : 'bg-white')} />))}
      </div>
    </div>
  );
}
