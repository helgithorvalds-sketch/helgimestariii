import { useState, type ChangeEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '../../lib/i18n';
import { MAX_QUANTITY, MIN_QUANTITY } from './schemas';
import { invalidControlClass } from './fields';

export type QuantityInputProps = {
  id: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Stepper (− / number / +) for 1–10 tickets; every control is a real button or input, 40px tall. */
export function QuantityInput({
  id,
  value,
  onChange,
  onBlur,
  min = MIN_QUANTITY,
  max = MAX_QUANTITY,
  disabled,
  invalid,
  describedBy,
  className,
}: QuantityInputProps) {
  const t = useT();
  // Local text so the user can clear the field and type a new number; committed when valid or on blur.
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  const commit = (n: number) => {
    const next = clamp(n, min, max);
    setText(String(next));
    if (next !== value) onChange(next);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= min && n <= max && n !== value) onChange(n);
  };

  const handleBlur = () => {
    const n = parseInt(text, 10);
    commit(Number.isNaN(n) ? value : n);
    onBlur?.();
  };

  return (
    <div className={cn('inline-flex items-stretch', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-11 rounded-r-none border-r-0 bg-card hover:bg-surface-2"
        onClick={() => commit(value - 1)}
        disabled={disabled || value <= min}
        aria-label={t('forms.field.decrease')}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-10 w-16 rounded-none bg-background text-center text-[14px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          invalid && invalidControlClass,
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-11 rounded-l-none border-l-0 bg-card hover:bg-surface-2"
        onClick={() => commit(value + 1)}
        disabled={disabled || value >= max}
        aria-label={t('forms.field.increase')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
