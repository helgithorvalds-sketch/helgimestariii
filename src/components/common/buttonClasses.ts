/**
 * DESIGN-v2 §2 button looks that shadcn's Button does not ship, used with
 * `variant="outline"`: `<Button variant="outline" className={askButtonClass}>Kaupa</Button>`.
 * primary = solid blue, secondary = white with border, ghost = blue text.
 */
/** Solid blue (the "Kaupa" / confirm side). */
export const askButtonClass =
  'border-primary bg-primary text-primary-foreground hover:border-primary/90 hover:bg-primary/90 hover:text-primary-foreground';
/** Blue outline (the "Ég vil kaupa" / "Selja til" side). */
export const bidButtonClass = 'border-primary/40 bg-card text-primary hover:border-primary hover:bg-accent hover:text-accent-foreground';
/** Neutral secondary: white, 1px border, light-grey hover. */
export const secondaryButtonClass = 'border-border bg-card text-foreground hover:border-border hover:bg-secondary hover:text-foreground';
/** Ghost: blue text, light-blue hover, no border. */
export const ghostButtonClass = 'border-transparent bg-transparent text-primary hover:border-transparent hover:bg-accent hover:text-accent-foreground';
/** Phone-first sizing: 44px on phones, 40px from sm. */
export const cardButtonClass = 'h-11 sm:h-10 rounded-lg text-[14px] font-semibold';
