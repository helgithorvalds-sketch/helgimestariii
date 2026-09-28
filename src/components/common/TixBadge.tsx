import { Flame, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { tixBadgeOf, type TixFields } from './tixSignals';

/** Small pill: "Uppselt á tix.is" (dark) or "Vinsælt á tix.is" (blue). Renders nothing otherwise. */
export function TixBadge({ event, className }: { event: TixFields; className?: string }) {
  const t = useT();
  const kind = tixBadgeOf(event);
  if (!kind) return null;
  const Icon = kind === 'soldOut' ? Ticket : Flame;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold shadow-sm',
        kind === 'soldOut' ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground',
        className,
      )}
      data-testid="tix-badge"
      data-kind={kind}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(kind === 'soldOut' ? 'home.badge.soldOut' : 'home.badge.popular')}
    </span>
  );
}
