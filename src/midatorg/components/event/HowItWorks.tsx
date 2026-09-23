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

/** Panel "Hvernig virkar þetta?": three numbered steps and the face-value note. */
export function HowItWorks({ faceValue = null, reservationMinutes = 30, className }: HowItWorksProps) {
  const t = useT();
  const steps = [
    { title: t('event.how.step1.title'), body: t('event.how.step1.body', { minutes: reservationMinutes }) },
    { title: t('event.how.step2.title'), body: t('event.how.step2.body') },
    { title: t('event.how.step3.title'), body: t('event.how.step3.body') },
  ];
  return (
    <section className={cn('mt-panel', className)} aria-labelledby="mt-how-h">
      <div className="border-b border-border px-[14px] py-3">
        <h2 id="mt-how-h" className="text-[14px] font-semibold">
          {t('event.how.title')}
        </h2>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3 px-[14px] py-3">
            <span
              aria-hidden="true"
              className="mt-mono inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[12px] text-foreground"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold">{s.title}</h3>
              <p className="text-[12.5px] text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex items-start gap-2 border-t border-border bg-surface-2/60 px-[14px] py-3 text-[12.5px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
        <p>
          {faceValue != null
            ? t('event.how.faceNoteWithPrice', { price: formatISK(faceValue) })
            : t('event.how.faceNote')}
        </p>
      </div>
    </section>
  );
}
