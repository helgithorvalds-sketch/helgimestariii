import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { parseApiError } from '../../lib/errors';

type ErrorStateProps = {
  error?: unknown;
  retry?: () => void;
  title?: string;
  body?: string;
  retryLabel?: string;
  className?: string;
};

/** Page-level error panel: white, soft red border, one sentence and a retry button. */
export function ErrorState({ error, retry, title, body, retryLabel, className }: ErrorStateProps) {
  const t = useT();
  const message = body ?? (error !== undefined ? t(parseApiError(error).key) : t('common.errorBody'));
  return (
    <div
      role="alert"
      className={cn('mt-panel flex flex-col items-start gap-3 border-destructive/30 p-4 sm:flex-row sm:items-center', className)}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-down" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{title ?? t('common.errorTitle')}</p>
        <p className="text-[14px] text-muted-foreground">{message}</p>
      </div>
      {retry && (
        <Button type="button" variant="outline" size="sm" onClick={retry} className="h-10 shrink-0 rounded-lg">
          {retryLabel ?? t('common.retry')}
        </Button>
      )}
    </div>
  );
}
