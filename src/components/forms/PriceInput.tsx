import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useT } from '../../lib/i18n';
import { caretAfterDigits, formatIskInput, parseIsk } from './schemas';
import { invalidControlClass } from './fields';

export type PriceInputProps = {
  id: string;
  /** Integer krónur, or null while empty. */
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoComplete?: string;
  className?: string;
};

/**
 * ISK amount input: formats with dot thousands separators while typing ("8.900"),
 * keeps the caret in place, reports integers. Numeric keyboard on phones.
 */
export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(function PriceInput(
  { id, value, onChange, onBlur, name, placeholder, disabled, invalid, describedBy, autoComplete = 'off', className },
  ref,
) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const [text, setText] = useState(() => formatIskInput(value));
  const [lastValue, setLastValue] = useState<number | null>(value);
  const pendingCaret = useRef<number | null>(null);

  // Keep the text in sync when the value changes from outside (reset, prefill).
  if (value !== lastValue) {
    setLastValue(value);
    if (parseIsk(text) !== value) setText(formatIskInput(value));
  }

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || pendingCaret.current == null) return;
    const pos = caretAfterDigits(text, pendingCaret.current);
    pendingCaret.current = null;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* not focused / unsupported */
    }
  }, [text]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    const n = parseIsk(raw);
    pendingCaret.current = digitsBefore;
    setText(formatIskInput(n));
    if (n !== value) onChange(n);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={text}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder ?? '0'}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn('h-10 bg-background pr-10 text-[14px] tabular-nums', invalid && invalidControlClass)}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground"
      >
        {t('common.kr')}
      </span>
    </div>
  );
});
