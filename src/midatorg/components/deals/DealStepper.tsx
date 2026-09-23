import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { DealStatus } from '../../lib/types';
import { DEAL_STEPS, badgeFor, stepStates, terminalBadge, type BadgeTone, type StepSource, type StepState } from './dealState';

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  reserved: 'bg-bid/10 text-bid',
  progress: 'bg-verified/10 text-verified',
  done: 'bg-up/10 text-up',
  muted: 'border border-border bg-surface-2 text-muted-foreground',
  disputed: 'bg-destructive/10 text-down',
};

/** Status pill: "Tekið frá" · "Greitt" · "Miðar sendir" · "Lokið" · "Hætt við" · "Rann út" · "Ágreiningur". */
export function DealStatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  const t = useT();
  const { labelKey, tone } = badgeFor(status);
  return (
    <span
      className={cn(
        'inline-flex h-[20px] shrink-0 items-center whitespace-nowrap rounded-[4px] px-1.5 text-[11px] font-semibold leading-none',
        BADGE_TONE_CLASS[tone],
        className,
      )}
      data-status={status}
      data-tone={tone}
    >
      {t(labelKey)}
    </span>
  );
}

const NUMERAL_CLASS: Record<StepState, string> = {
  done: 'border-ask bg-ask text-ask-foreground',
  current: 'border-primary bg-transparent text-foreground',
  upcoming: 'border-border bg-transparent text-muted-foreground',
  halted: 'border-border bg-transparent text-muted-foreground opacity-60',
};

const LABEL_CLASS: Record<StepState, string> = {
  done: 'text-foreground',
  current: 'font-semibold text-foreground',
  upcoming: 'text-muted-foreground',
  halted: 'text-muted-foreground opacity-60',
};

type DealStepperProps = {
  deal: StepSource;
  className?: string;
};

/**
 * Four milestones (Tekið frá → Greitt → Miðar sendir → Lokið) with a terminal
 * badge for cancelled / expired / disputed. Horizontal from `sm`, vertical on phones.
 */
export function DealStepper({ deal, className }: DealStepperProps) {
  const t = useT();
  const states = stepStates(deal);
  const terminal = terminalBadge(deal.status);
  return (
    <section className={cn('mt-panel p-[14px]', className)} aria-label={t('deals.stepper.label')}>
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        {DEAL_STEPS.map((step, i) => {
          const state = states[i];
          const last = i === DEAL_STEPS.length - 1;
          return (
            <li
              key={step}
              className={cn('flex min-w-0 items-center gap-2', !last && 'sm:flex-1')}
              aria-current={state === 'current' ? 'step' : undefined}
              data-step={step}
              data-state={state}
            >
              <span
                className={cn(
                  'mt-mono inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium leading-none',
                  NUMERAL_CLASS[state],
                )}
                aria-hidden="true"
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn('whitespace-nowrap text-[13px]', LABEL_CLASS[state])}>{t(`dealStatus.${step}`)}</span>
              <span className="sr-only">, {t(`deals.stepper.state.${state}`)}</span>
              {!last && <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      {terminal && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <DealStatusBadge status={terminal} />
        </div>
      )}
    </section>
  );
}
