import { useId, type KeyboardEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useT } from '../../lib/i18n';
import { parseApiError } from '../../lib/errors';
import { useCreateManualEvent } from '../../lib/queries';
import { EVENT_CATEGORIES } from '../../lib/constants';
import type { EventRow } from '../../lib/types';
import { Field, invalidControlClass } from './fields';
import { PriceInput } from './PriceInput';
import {
  emptyToNull,
  manualEventDefaults,
  manualEventSchema,
  normalizeTixUrl,
  toStartsAtIso,
  type ManualEventFormValues,
} from './schemas';

export type ManualEventFormProps = {
  /** Prefills the title (usually the search text that found nothing). */
  initialTitle?: string;
  onCreated: (event: EventRow) => void;
  onCancel: () => void;
  className?: string;
};

function todayLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Inline "Bæta við viðburði" form. It lives inside the sell/want <form>, so it
 * renders as a <fieldset> with its own react-hook-form instance and a
 * type="button" submit; Enter inside its inputs saves the event instead of
 * submitting the outer form.
 */
export function ManualEventForm({ initialTitle = '', onCreated, onCancel, className }: ManualEventFormProps) {
  const t = useT();
  const uid = useId();
  const create = useCreateManualEvent();
  const form = useForm<ManualEventFormValues>({
    resolver: zodResolver(manualEventSchema),
    mode: 'onTouched',
    defaultValues: { ...manualEventDefaults, title: initialTitle },
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;
  const busy = isSubmitting || create.isPending;

  const onSubmit = async (raw: ManualEventFormValues) => {
    const v = manualEventSchema.parse(raw);
    const starts_at = toStartsAtIso(v.date, v.time);
    if (!starts_at) {
      setError('date', { type: 'manual', message: 'forms.error.dateRequired' });
      return;
    }
    try {
      const created = await create.mutateAsync({
        title: v.title,
        category: v.category,
        starts_at,
        venue_name: emptyToNull(v.venue_name),
        city: emptyToNull(v.city),
        tix_url: normalizeTixUrl(v.tix_url),
        face_value_min: v.face_value_min,
        face_value_max: v.face_value_max,
      });
      toast.success(t('forms.manual.success'));
      onCreated(created);
    } catch (err) {
      // the mutation hook already toasted the translated message
      if (parseApiError(err).code === 'EVENT_IN_PAST') {
        setError('date', { type: 'server', message: 'forms.error.dateInPast' });
      }
    }
  };

  const submit = () => {
    void handleSubmit(onSubmit)();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFieldSetElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      submit();
    }
  };

  const id = (name: string) => `${uid}-${name}`;
  const inputClass = 'h-10 bg-background text-[14px]';

  return (
    <fieldset onKeyDown={onKeyDown} className={cn('mt-panel space-y-4 bg-card p-4', className)} data-testid="manual-event-form">
      <legend className="sr-only">{t('forms.manual.title')}</legend>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">{t('forms.manual.title')}</p>
          <p className="text-[12.5px] text-muted-foreground">{t('forms.manual.intro')}</p>
        </div>
      </div>

      <Field id={id('title')} label={t('forms.manual.eventTitle')} error={errors.title?.message}>
        {(p) => (
          <Input
            id={p.id}
            {...register('title')}
            autoFocus
            maxLength={200}
            placeholder={t('forms.manual.eventTitlePlaceholder')}
            aria-describedby={p.describedBy}
            aria-invalid={p.invalid || undefined}
            className={cn(inputClass, p.invalid && invalidControlClass)}
          />
        )}
      </Field>

      <Field id={id('category')} label={t('forms.manual.category')} error={errors.category?.message}>
        {(p) => (
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                <SelectTrigger id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid || undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`category.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id('venue')} label={t('forms.manual.venue')} optional error={errors.venue_name?.message}>
          {(p) => (
            <Input
              id={p.id}
              {...register('venue_name')}
              maxLength={120}
              placeholder={t('forms.manual.venuePlaceholder')}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              className={cn(inputClass, p.invalid && invalidControlClass)}
            />
          )}
        </Field>
        <Field id={id('city')} label={t('forms.manual.city')} optional error={errors.city?.message}>
          {(p) => (
            <Input
              id={p.id}
              {...register('city')}
              maxLength={80}
              placeholder={t('forms.manual.cityPlaceholder')}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              className={cn(inputClass, p.invalid && invalidControlClass)}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id('date')} label={t('forms.manual.date')} error={errors.date?.message}>
          {(p) => (
            <Input
              id={p.id}
              type="date"
              min={todayLocalIso()}
              {...register('date')}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              className={cn(inputClass, 'tabular-nums', p.invalid && invalidControlClass)}
            />
          )}
        </Field>
        <Field id={id('time')} label={t('forms.manual.time')} error={errors.time?.message}>
          {(p) => (
            <Input
              id={p.id}
              type="time"
              step={300}
              {...register('time')}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              className={cn(inputClass, 'tabular-nums', p.invalid && invalidControlClass)}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={id('face-min')}
          label={t('forms.manual.faceMin')}
          optional
          hint={t('forms.manual.faceHint')}
          error={errors.face_value_min?.message}
        >
          {(p) => (
            <Controller
              name="face_value_min"
              control={control}
              render={({ field }) => (
                <PriceInput
                  id={p.id}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={p.invalid}
                  describedBy={p.describedBy}
                  disabled={busy}
                />
              )}
            />
          )}
        </Field>
        <Field id={id('face-max')} label={t('forms.manual.faceMax')} optional error={errors.face_value_max?.message}>
          {(p) => (
            <Controller
              name="face_value_max"
              control={control}
              render={({ field }) => (
                <PriceInput
                  id={p.id}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={p.invalid}
                  describedBy={p.describedBy}
                  disabled={busy}
                />
              )}
            />
          )}
        </Field>
      </div>

      <Field id={id('tix')} label={t('forms.manual.tixUrl')} optional error={errors.tix_url?.message}>
        {(p) => (
          <Input
            id={p.id}
            type="text"
            inputMode="url"
            {...register('tix_url')}
            placeholder={t('forms.manual.tixUrlPlaceholder')}
            aria-describedby={p.describedBy}
            aria-invalid={p.invalid || undefined}
            className={cn(inputClass, p.invalid && invalidControlClass)}
          />
        )}
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-10 bg-card hover:bg-surface-2" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button type="button" className="h-10" onClick={submit} disabled={busy}>
          {busy ? t('common.saving') : t('forms.manual.submit')}
        </Button>
      </div>
    </fieldset>
  );
}
