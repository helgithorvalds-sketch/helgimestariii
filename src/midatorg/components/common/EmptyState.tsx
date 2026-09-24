import type { ComponentType, ReactNode } from 'react';
import { Inbox, type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: ComponentType<LucideProps>;
  title: string;
  body?: string;
  /** A Button / Link rendered under the text. */
  action?: ReactNode;
  className?: string;
};

/** White bordered panel for empty lists ("Engir viðburðir fundust" + action). */
export function EmptyState({ icon: Icon = Inbox, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('mt-panel flex flex-col items-center px-6 py-12 text-center', className)} role="status">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-[16px] font-semibold text-foreground">{title}</p>
      {body && <p className="mt-1 max-w-md text-[14px] text-muted-foreground">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
