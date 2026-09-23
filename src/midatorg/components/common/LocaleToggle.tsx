import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';

/** IS ⇄ EN toggle. Icon button with the *other* locale's short code as its label. */
export function LocaleToggle({ className }: { className?: string }) {
  const [locale, setLocale] = useLocale();
  const t = useT();
  const next = locale === 'is' ? 'en' : 'is';
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-9 gap-1.5 px-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground', className)}
      onClick={() => setLocale(next)}
      aria-label={`${t('locale.toggle')}: ${t(`locale.${next}`)}`}
      title={t(`locale.${next}`)}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span aria-hidden="true">{t(`locale.short.${next}`)}</span>
    </Button>
  );
}
