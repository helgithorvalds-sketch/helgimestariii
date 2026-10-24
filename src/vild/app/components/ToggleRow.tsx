import { useId, type ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** Label · caption · switch, 56px tall, inside a Card. */
export function ToggleRow({ label, caption, checked, onCheckedChange, disabled, icon, className }: { label: string; caption?: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; icon?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn('flex min-h-[56px] items-center gap-3 px-4 py-3', className)}>
      {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-[hsl(var(--green-500))]">{icon}</div>}
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[15px] font-semibold leading-tight">{label}</span>
        {caption && <span className="mt-0.5 block text-[13px] text-muted-foreground">{caption}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="data-[state=checked]:bg-[hsl(var(--green-500))]" />
    </div>
  );
}
