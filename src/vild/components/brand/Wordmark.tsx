import { cn } from '@/lib/utils';

/**
 * The VILD wordmark: thin geometric letters, widely spaced, exactly like the
 * logo. Rendered as text so it scales, selects and reads to screen readers.
 * The trailing letter-spacing after the D is cancelled with a negative margin,
 * so the box is exactly the ink: it starts on the grid and centres true.
 */
export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'text-[15px]', md: 'text-[20px]', lg: 'text-[32px]', xl: 'text-[56px] sm:text-[80px]' };
  return (
    <span className={cn('vild-wordmark inline-block text-current', sizes[size], className)} aria-label="VILD">
      <span aria-hidden="true" className="-mr-[0.42em]">
        VILD
      </span>
    </span>
  );
}
