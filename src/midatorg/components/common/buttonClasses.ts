/**
 * DESIGN.md §5 button variants that shadcn's Button does not ship.
 * Use with `variant="outline"`: `<Button variant="outline" className={askButtonClass}>Kaupa</Button>`.
 */
export const askButtonClass =
  'border-ask/35 bg-ask/10 text-ask hover:border-ask hover:bg-ask hover:text-ask-foreground focus-visible:ring-ask';
export const bidButtonClass =
  'border-bid/35 bg-bid/10 text-bid hover:border-bid hover:bg-bid hover:text-bid-foreground focus-visible:ring-bid';
/** Neutral outline per DESIGN ("secondary"): card bg, border, hover surface-2. */
export const secondaryButtonClass = 'border-border bg-card text-foreground hover:bg-surface-2 hover:border-muted-foreground/60';
/** Phone-first sizing: 40px on phones, 34px from sm. */
export const cardButtonClass = 'h-10 sm:h-[34px] text-[13px] font-semibold';
