import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button (cancel listing, delete, ban). */
  destructive?: boolean;
  /** Disables both buttons while the action runs. */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Extra content (e.g. a reason textarea) between the description and the buttons. */
  children?: ReactNode;
};

/** Plain confirm dialog, no guilt copy (DESIGN.md §7). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={loading ? () => undefined : onOpenChange}>
      <AlertDialogContent className="mt-panel max-w-md bg-card p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">{title ?? t('common.confirmTitle')}</AlertDialogTitle>
          {description && <AlertDialogDescription className="text-[13px]">{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} className="h-9">
            {cancelLabel ?? t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn('h-9', destructive && buttonVariants({ variant: 'destructive', size: 'sm' }))}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {confirmLabel ?? t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
