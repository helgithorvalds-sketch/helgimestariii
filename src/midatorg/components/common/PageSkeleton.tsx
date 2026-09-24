import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Generic page-level skeleton: title, meta, three panels. Light-grey blocks, 1.2s pulse. */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 py-2', className)} aria-busy="true" aria-live="polite">
      <Skeleton className="h-7 w-56 bg-secondary" />
      <Skeleton className="h-4 w-80 max-w-full bg-secondary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-panel space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-lg bg-secondary" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4 bg-secondary" />
                <Skeleton className="h-3 w-1/2 bg-secondary" />
              </div>
            </div>
            <Skeleton className="h-6 w-28 bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}
