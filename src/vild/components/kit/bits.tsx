import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** "Krónur til baka"  ·  "Sjá allt →" */
export function SectionHeader({ title, action, to, className, eyebrow }: { title: string; action?: string; to?: string; className?: string; eyebrow?: string }) {
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div>
        {eyebrow && <p className="vild-eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-[19px] font-bold leading-tight tracking-tight">{title}</h2>
      </div>
      {action && to && (
        // py-3 -my-3: a 44 px touch target that takes no more room than the text.
        <Link to={to} className="-my-3 inline-flex shrink-0 items-center gap-0.5 py-3 text-[14px] font-semibold text-[hsl(var(--green-500))]">
          {action}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function Card({ className, children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' | 'li' }) {
  return <Tag className={cn('rounded-2xl border border-border bg-white', className)}>{children}</Tag>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-secondary', className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)} role="status">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-[hsl(var(--green-500))]">{icon}</div>}
      <p className="text-[16px] font-bold">{title}</p>
      {body && <p className="mt-1 max-w-[32ch] text-[14px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry, className }: { message: string; retry?: () => void; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[14px]', className)} role="alert">
      <p className="font-semibold text-destructive">{message}</p>
      {retry && (
        <button type="button" onClick={retry} className="mt-1 font-semibold text-[hsl(var(--green-500))]">
          Reyna aftur
        </button>
      )}
    </div>
  );
}

/** A row inside a list card: icon · text · right side · chevron. */
export function Row({ to, onClick, icon, title, subtitle, right, className }: { to?: string; onClick?: () => void; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; className?: string }) {
  const body = (
    <>
      {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-[hsl(var(--green-500))]">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold leading-tight">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-right text-[15px]">{right}</div>}
      {(to || onClick) && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const cls = cn('flex w-full items-center gap-3 px-4 py-3 text-left', (to || onClick) && 'transition-colors hover:bg-secondary/60 active:bg-secondary', className);
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}
