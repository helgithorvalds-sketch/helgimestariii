import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { formatISK } from '../../lib/format';

export type HowItWorksProps = {
  /** Face value shown in the note; null → generic sentence. */
  faceValue?: number | null;
  /** `mt_settings.reservation_minutes` (default 30). */
  reservationMinutes?: number;
  className?: string;
};

/** "Hvernig virkar þetta?": three numbered steps in plain words and the face-value sentence. */
export function HowItWorks({ faceValue = null, reservationMinutes = 30, className }: HowItWorksProps) {
  const t = useT();
  const steps = [
    { title: t('event.how.step1.title'), body: t('event.how.step1.body', { minutes: reservationMinutes }) },
    { title: t('event.how.step2.title'), body: t('event.how.step2.body') },
    { title: t('event.how.step3.title'), body: t('event.how.step3.body') },
  ];
  return (
    <section className={cn('mt-panel p-4 sm:p-5', className)} aria-labelledby="mt-how-h">
      <h2 id="mt-how-h" className="text-[20px] font-semibold tracking-tight">
        {t('event.how.title')}
      </h2>
      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold tabular-nums text-primary-foreground"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold leading-7">{s.title}</h3>
              <p className="text-[14px] text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-[14px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{faceValue != null ? t('event.how.faceNoteWithPrice', { price: formatISK(faceValue) }) : t('event.how.faceNote')}</span>
      </p>
    </section>
  );
}
