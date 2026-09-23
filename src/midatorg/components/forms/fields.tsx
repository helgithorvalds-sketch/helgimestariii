import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useT } from '../../lib/i18n';

// ---------------------------------------------------------------------------
// FormSection — one numbered step of the vertical stepper (DESIGN.md "Sell form")
// ---------------------------------------------------------------------------
type FormSectionProps = {
  step: number;
  title: string;
  optional?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ step, title, optional = false, description, children, className }: FormSectionProps) {
  const t = useT();
  const headingId = `mt-form-step-${step}`;
  return (
    <section aria-labelledby={headingId} className={cn('border-t border-border px-4 py-5 first:border-t-0 sm:px-5', className)}>
      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-mono inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[12px] text-muted-foreground"
        >
          {step}
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold leading-6">
            {title}
            {optional && <span className="ml-1 font-normal text-muted-foreground">({t('common.optional')})</span>}
          </h2>
          {description && <p className="text-[12.5px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 sm:pl-9">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Field — label + control + hint + inline error, wired with aria-describedby
// ---------------------------------------------------------------------------
export type FieldRenderProps = {
  id: string;
  /** Pass straight to the control's `aria-describedby`. */
  describedBy: string | undefined;
  invalid: boolean;
};

type FieldProps = {
  id: string;
  label: string;
  optional?: boolean;
  /** Static helper text under the control. */
  hint?: ReactNode;
  /** An i18n key (forms.error.* / errors.*) or a ready sentence. */
  error?: string | null;
  /** `span` when the control is not a native labelable element (e.g. a cmdk combobox with its own label). */
  labelAs?: 'label' | 'span';
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
};

/** Inline errors are 12px `text-down` under the field, referenced from the control (DESIGN.md §7). */
export function Field({ id, label, optional = false, hint, error, labelAs = 'label', className, children }: FieldProps) {
  const t = useT();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  const labelBody = (
    <>
      {label}
      {optional && <span className="ml-1 font-normal text-muted-foreground">({t('common.optional')})</span>}
    </>
  );
  return (
    <div className={cn('space-y-1.5', className)}>
      {labelAs === 'label' ? (
        <Label htmlFor={id} className="text-[13px] font-medium">
          {labelBody}
        </Label>
      ) : (
        <span className="block text-[13px] font-medium leading-none">{labelBody}</span>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {hint && (
        <p id={hintId} className="text-[12px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[12px] font-medium text-down">
          {t(error)}
        </p>
      )}
    </div>
  );
}

/** Border/ring classes for an invalid control (used by inputs that are not wrapped by Field). */
export const invalidControlClass = 'border-destructive focus-visible:ring-destructive';
