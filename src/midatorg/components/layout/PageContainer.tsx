import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** 1400px max, 16px gutters on phones and 24px from sm (DESIGN.md §4). */
export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-[1400px] px-4 sm:px-6', className)} {...props} />;
}
