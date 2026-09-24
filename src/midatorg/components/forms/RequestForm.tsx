import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '../../lib/i18n';
import { parseApiError } from '../../lib/errors';
import { formatISK } from '../../lib/format';
import { href } from '../../lib/paths';
import { useCreateRequest } from '../../lib/queries';
import type { MarketEvent } from '../../lib/types';
import { bidButtonClass } from '../common/buttonClasses';
import { EventPicker } from './EventPicker';
import { Field, FormSection, invalidControlClass } from './fields';
import { PriceInput } from './PriceInput';
import { QuantityInput } from './QuantityInput';
import { emptyToNull, MAX_REQUEST_NOTES_LENGTH, requestDefaults, requestSchema, type RequestFormValues } from './schemas';

export type RequestFormProps = {
  /** `?event=<id>`: preselects the event in the picker. */
  preselectEventId?: string | null;
  className?: string;
};

/**
 * Want form: event → quantity, optional max price (≤ the event's face value when
 * known), notes → createRequest → toast → event page. REQUEST_EXISTS shows an
 * inline notice with links instead of a dead end.
 */
export function RequestForm({ preselectEventId, className }: RequestFormProps) {
  const t = useT();
  const navigate = useNavigate();
  const createRequest = useCreateRequest();
  const [event, setEvent] = useState<MarketEvent | null>(null);
  /** Event id for which the server said REQUEST_EXISTS. */
  const [existsFor, setExistsFor] = useState<string | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    mode: 'onTouched',
    defaultValues: requestDefaults,
  });
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;
  const busy = isSubmitting || createRequest.isPending;

  const handleEventChange = useCallback(
    (next: MarketEvent | null) => {
      setEvent(next);
      setExistsFor(null);
      setValue('event_id', next?.id ?? '', { shouldValidate: !!next, shouldDirty: true });
      setValue('face_cap', next?.face_value_max ?? null);
    },
    [setValue],
  );

  const onSubmit = async (raw: RequestFormValues) => {
    const v = requestSchema.parse(raw);
    setExistsFor(null);
    try {
      const created = await createRequest.mutateAsync({
        event_id: v.event_id,
        quantity: v.quantity,
        max_price: v.max_price,
        notes: emptyToNull(v.notes),
      });
      toast.success(t('forms.want.success'));
      navigate(href(`/vidburdir/${created.event_id}`));
    } catch (err) {
      // the mutation hook already toasted the translated message
      const { code } = parseApiError(err);
      if (code === 'REQUEST_EXISTS') setExistsFor(v.event_id);
      else if (code === 'EVENT_NOT_UPCOMING' || code === 'EVENT_NOT_FOUND') {
        setError('event_id', { type: 'server', message: `errors.${code}` });
      }
    }
  };

  const faceCap = event?.face_value_max ?? null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={cn('mt-panel overflow-hidden', className)}>
      <FormSection step={1} title={t('forms.step.event')}>
        <EventPicker
          value={event}
          onChange={handleEventChange}
          preselectId={preselectEventId}
          error={errors.event_id?.message}
          disabled={busy}
        />
      </FormSection>

      <FormSection step={2} title={t('forms.step.request')}>
        <Field id="mt-want-quantity" label={t('forms.field.quantity')} hint={t('forms.field.quantityHint')} error={errors.quantity?.message}>
          {(p) => (
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <QuantityInput
                  id={p.id}
                  value={field.value}
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

        <Field
          id="mt-max-price"
          label={t('forms.want.maxPrice')}
          optional
          hint={
            faceCap != null
              ? `${t('forms.want.maxPriceHint')} ${t('forms.want.maxPriceCap', { face: formatISK(faceCap) })}`
              : t('forms.want.maxPriceHint')
          }
          error={errors.max_price?.message}
          className="sm:max-w-xs"
        >
          {(p) => (
            <Controller
              name="max_price"
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

        <Field id="mt-want-notes" label={t('forms.field.notes')} optional error={errors.notes?.message}>
          {(p) => (
            <Textarea
              id={p.id}
              {...register('notes')}
              rows={3}
              maxLength={MAX_REQUEST_NOTES_LENGTH}
              placeholder={t('forms.want.notesPlaceholder')}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              disabled={busy}
              className={cn('bg-background text-[14px]', p.invalid && invalidControlClass)}
            />
          )}
        </Field>
      </FormSection>

      {existsFor && (
        <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-border bg-secondary p-3 sm:mx-5" role="alert">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-bid" aria-hidden="true" />
          <div className="min-w-0 space-y-1 text-[13px]">
            <p className="font-semibold">{t('forms.want.existsTitle')}</p>
            <p className="text-muted-foreground">{t('forms.want.existsBody')}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <Link to={href(`/vidburdir/${existsFor}`)} className="font-medium underline underline-offset-2 hover:text-foreground">
                {t('forms.want.viewEvent')}
              </Link>
              <Link to={href('/eg')} className="font-medium underline underline-offset-2 hover:text-foreground">
                {t('forms.want.existsLink')}
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-border bg-secondary px-4 py-4 sm:px-5">
        <Button type="submit" variant="outline" className={cn(bidButtonClass, 'h-10 w-full font-semibold sm:w-auto')} disabled={busy}>
          {busy ? t('forms.want.submitting') : t('forms.want.submit')}
        </Button>
        <p className="mt-2 text-[12px] text-muted-foreground">{t('forms.want.afterNote')}</p>
      </div>
    </form>
  );
}
