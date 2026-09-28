import { List, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { HomeView } from './viewPref';

/** Segmented "Kort · Listi" control. */
export function ViewToggle({ value, onChange, className }: { value: HomeView; onChange: (v: HomeView) => void; className?: string }) {
  const t = useT();
  const items: { v: HomeView; label: string; Icon: typeof List }[] = [
    { v: 'map', label: t('map.view.map'), Icon: MapIcon },
    { v: 'list', label: t('map.view.list'), Icon: List },
  ];
  return (
    <div role="group" aria-label={t('map.view.label')} className={cn('inline-flex rounded-full border border-border bg-secondary p-1', className)} data-testid="view-toggle">
      {items.map(({ v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors',
            value === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
