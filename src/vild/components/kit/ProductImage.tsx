import { useState } from 'react';
import { cn } from '@/lib/utils';
import { initialsOf } from '../../lib/format';

const TINTS = ['bg-[#E8FFE0]', 'bg-[#FFF3C4]', 'bg-[#E6F0FF]', 'bg-[#FFE8E0]', 'bg-[#F0E8FF]', 'bg-[#E0F7F4]'];

function tintFor(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/**
 * Product / place picture with a graceful placeholder (soft tint + initials)
 * while loading or when the file is missing. Never a broken-image icon.
 */
export function ProductImage({ src, alt, name, className, imgClassName, eager = false }: { src: string | null | undefined; alt?: string; name: string; className?: string; imgClassName?: string; eager?: boolean }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(src ? 'loading' : 'error');
  return (
    <div className={cn('relative overflow-hidden', tintFor(name), className)}>
      {state !== 'ok' && (
        <span className="absolute inset-0 flex items-center justify-center font-display text-[22px] text-[hsl(var(--green-700))]/60" aria-hidden="true">
          {initialsOf(name)}
        </span>
      )}
      {src && state !== 'error' && (
        <img
          src={src}
          alt={alt ?? ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0', imgClassName)}
        />
      )}
    </div>
  );
}
