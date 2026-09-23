import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';

export type SearchFieldProps = {
  /** The committed query (from the URL). */
  value: string;
  /** Called with the trimmed text after `delay` ms of quiet, on Enter, and on clear. */
  onChange: (q: string) => void;
  delay?: number;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
};

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounced search input (DESIGN.md §5 SearchField): 36px, card bg, search icon,
 * a clear button when there is text. Enter commits immediately; Escape clears.
 * External changes to `value` (e.g. the nav search or the back button) are
 * mirrored into the field unless the user is mid-edit on the same text.
 */
export function SearchField({
  value,
  onChange,
  delay = SEARCH_DEBOUNCE_MS,
  placeholder,
  label,
  className,
  autoFocus,
}: SearchFieldProps) {
  const t = useT();
  const id = useId();
  const [text, setText] = useState(value);
  const timer = useRef<number | null>(null);
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const emit = (next: string) => {
    clearTimer();
    const trimmed = next.trim();
    if (trimmed === lastEmitted.current) return;
    lastEmitted.current = trimmed;
    onChangeRef.current(trimmed);
  };

  // mirror outside changes (URL navigation, nav search) into the field
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      clearTimer();
      setText(value);
    }
  }, [value]);

  useEffect(() => clearTimer, []);

  const handleInput = (next: string) => {
    setText(next);
    clearTimer();
    timer.current = window.setTimeout(() => emit(next), delay);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    emit(text);
  };

  const clear = () => {
    setText('');
    emit('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && text) {
      e.preventDefault();
      clear();
    }
  };

  return (
    <form role="search" aria-label={label ?? t('home.search.label')} onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label ?? t('home.search.label')}
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? t('home.search.placeholder')}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text && (
        <button
          type="button"
          onClick={clear}
          aria-label={t('home.search.clear')}
          className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

export default SearchField;
