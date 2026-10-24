/**
 * Portal-only building blocks: a denser, calmer take on the kit for admin
 * screens. White panels with hairlines on surface-2, 16px radius, tabular
 * numbers, green for actions. Yellow is reserved for CreditTag (kit).
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip, type ChipTone } from '../../components/kit/Chip';

/** Page title (28/800) + one-line description, with an optional action on the right. */
export function PageHeader({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

/** A white card with a hairline. The only container in the portal. */
export function Panel({ className, children, as: Tag = 'section' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' | 'form' }) {
  return <Tag className={cn('rounded-2xl border border-border bg-white', className)}>{children}</Tag>;
}

/** Title row inside a panel: 17/700 + optional caption + right side. Hairline below. */
export function PanelHeader({ title, caption, right, className }: { title: ReactNode; caption?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold leading-tight tracking-tight">{title}</h2>
        {caption && <p className="mt-0.5 text-[13px] text-muted-foreground">{caption}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

/** Label + control + optional hint. */
export function Field({ label, hint, htmlFor, children, className }: { label: string; hint?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** shadcn Input, portal-sized: 44px, 12px radius, 15px type. */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  return <Input ref={ref} className={cn('h-11 rounded-xl border-border bg-white px-3.5 text-[15px] md:text-[15px] placeholder:text-muted-foreground/70', className)} {...rest} />;
});

/** Segmented control: 2–4 options, one selected. Mint-50 + green for the active segment. */
export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex h-10 items-center rounded-xl border border-border bg-secondary p-1', className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-8 flex-1 whitespace-nowrap rounded-[9px] px-3 text-[14px] font-semibold transition-colors',
              selected ? 'bg-white text-[hsl(var(--green-500))] shadow-[var(--shadow-sm)]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** −/+ stepper. `size="lg"` is the hero on the credit page (56/800). */
export function Stepper({ value, onChange, min = 0, max = 100, step = 1, format = (v: number) => String(v), size = 'md', label, className }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string; size?: 'md' | 'lg'; label: string; className?: string }) {
  const lg = size === 'lg';
  const btn = cn(
    'flex shrink-0 items-center justify-center rounded-full border border-border bg-white text-foreground transition-colors hover:bg-secondary active:bg-secondary disabled:opacity-40 disabled:hover:bg-white',
    lg ? 'h-14 w-14' : 'h-11 w-11',
  );
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className={cn('flex items-center', lg ? 'gap-5' : 'gap-3', className)} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label="Minnka">
        <Minus className={lg ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
      </button>
      <output className={cn('vild-num min-w-[3ch] text-center font-extrabold tracking-[-0.03em]', lg ? 'text-[56px] leading-none' : 'text-[24px] leading-none')} aria-live="polite">
        {format(value)}
      </output>
      <button type="button" className={btn} onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label="Auka">
        <Plus className={lg ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
      </button>
    </div>
  );
}

export type Status = 'connected' | 'pending' | 'offline';
const STATUS: Record<Status, { label: string; tone: ChipTone; dot: string }> = {
  connected: { label: 'Tengt', tone: 'mint', dot: 'bg-[hsl(var(--success))]' },
  pending: { label: 'Í vinnslu', tone: 'yellow', dot: 'bg-[hsl(var(--yellow-ink))]' },
  offline: { label: 'Ótengt', tone: 'neutral', dot: 'bg-muted-foreground' },
};
/** POS status: Tengt / Í vinnslu / Ótengt. */
export function PosStatusChip({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <Chip tone={s.tone}>
      <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', s.dot)} aria-hidden="true" />
      {s.label}
    </Chip>
  );
}

/** Icon-only button, 36px, hairline on hover. */
export function IconButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }) {
  return (
    <button type="button" className={cn('flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40', className)} {...rest}>
      {children}
    </button>
  );
}

/** Label/value pair in a definition list. */
export function KeyValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2.5', className)}>
      <dt className="text-[14px] text-muted-foreground">{label}</dt>
      <dd className="vild-num text-right text-[14px] font-semibold">{value}</dd>
    </div>
  );
}

/** Thin horizontal bar for shares: track in surface-2, fill in green. */
export function ShareBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)} role="img" aria-label={`${Math.round(pct)}%`}>
      <div className="h-full rounded-full bg-[hsl(var(--green-500))]" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** Table shell: hairline rows, 13px muted header, tabular numbers. Hidden on < md by callers who render cards instead. */
export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[14px]">{children}</table>
    </div>
  );
}
export function Th({ className, children, align = 'left' }: { className?: string; children?: ReactNode; align?: 'left' | 'right' }) {
  return <th className={cn('whitespace-nowrap border-b border-border px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground', align === 'right' ? 'text-right' : 'text-left', className)}>{children}</th>;
}
export function Td({ className, children, align = 'left' }: { className?: string; children?: ReactNode; align?: 'left' | 'right' }) {
  return <td className={cn('border-b border-border px-4 py-3 align-middle [tr:last-child_&]:border-b-0', align === 'right' ? 'vild-num text-right' : 'text-left', className)}>{children}</td>;
}

/** Initials avatar for team members. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--mint-100))] text-[13px] font-bold text-[hsl(var(--green-700))]', className)} aria-hidden="true">
      {initials}
    </span>
  );
}

/** Brand mark for a chain: logoText in a rounded square. */
export function ChainMark({ text, color, size = 36, className }: { text: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-[10px] font-extrabold text-white', className)}
      style={{ width: size, height: size, background: color ?? 'hsl(var(--green-500))', fontSize: Math.round(size * 0.44) }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}
