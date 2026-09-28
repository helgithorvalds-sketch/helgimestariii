import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLocale, useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { parseApiError } from '../../lib/errors';
import { formatISK, formatTickets } from '../../lib/format';
import { href } from '../../lib/paths';
import { useCreateListing, useSettings, useUploadProof } from '../../lib/queries';
import type { Listing, MarketEvent } from '../../lib/types';
import { PriceDelta } from '../common/PriceDelta';
import { EventPicker } from './EventPicker';
import { Field, FormSection, invalidControlClass } from './fields';
import { PriceInput } from './PriceInput';
import { ProofUpload } from './ProofUpload';
import { QuantityInput } from './QuantityInput';
import {
  emptyToNull,
  faceValueRange,
  listingDefaults,
  listingSchema,
  MAX_LISTING_NOTES_LENGTH,
  MAX_SEAT_INFO_LENGTH,
  MAX_TICKET_TYPE_LENGTH,
  type ListingFormValues,
} from './schemas';

export type ListingFormProps = {
  /** `?event=<id>`: preselects the event in the picker. */
  preselectEventId?: string | null;
  className?: string;
};

const inputClass = 'h-10 bg-background text-[14px]';

/**
 * Sell form: event → tickets → price (≤ face value, live delta) → optional proof.
 * Flow: createListing → uploadProof (if a file was chosen) → toast → event page.
 * If the proof upload fails after the listing exists, the form switches to a
 * recovery panel (retry with another file, or continue) so the listing is never
 * created twice.
 */
export function ListingForm({ preselectEventId, className }: ListingFormProps) {
  const t = useT();
  const [locale] = useLocale();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const settings = useSettings();
  const createListing = useCreateListing();
  const uploadProof = useUploadProof();

  const phoneRequired =
    settings.data?.some((s) => s.key === 'require_phone_to_sell' && (s.value === true || s.value === 'true')) ?? false;
  const showPhoneGate = phoneRequired && !!profile && profile.verification === 'none';

  const [event, setEvent] = useState<MarketEvent | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  /** Set when the listing exists but its proof upload failed. */
  const [created, setCreated] = useState<Listing | null>(null);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    mode: 'onTouched',
    defaultValues: listingDefaults,
  });
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const face = watch('face_value');
  const asking = watch('asking_price');
  const quantity = watch('quantity');
  const overCap = face != null && asking != null && asking > face;
  const askingError = errors.asking_price?.message ?? (overCap ? 'forms.error.aboveFace' : null);
  const busy = isSubmitting || createListing.isPending || uploadProof.isPending;

  const handleEventChange = useCallback(
    (next: MarketEvent | null) => {
      setEvent(next);
      setValue('event_id', next?.id ?? '', { shouldValidate: !!next, shouldDirty: true });
      // a single known face value is a safe prefill; a range is only shown as a hint
      if (next && next.face_value_min != null && next.face_value_min === next.face_value_max && getValues('face_value') == null) {
        setValue('face_value', next.face_value_min, { shouldDirty: true });
      }
    },
    [setValue, getValues],
  );

  const finish = (eventId: string) => {
    toast.success(t('forms.sell.success'));
    navigate(href(`/vidburdir/${eventId}`));
  };

  const uploadFor = async (listing: Listing, file: File): Promise<boolean> => {
    try {
      await uploadProof.mutateAsync({ listingId: listing.id, file });
      return true;
    } catch (err) {
      const { code } = parseApiError(err);
      setProofError(code === 'DUPLICATE_PROOF' ? t('forms.proof.duplicate') : t(`errors.${code}`));
      return false;
    }
  };

  const onSubmit = async (raw: ListingFormValues) => {
    const v = listingSchema.parse(raw);
    setProofError(null);
    let listing: Listing;
    try {
      listing = await createListing.mutateAsync({
        event_id: v.event_id,
        quantity: v.quantity,
        face_value: v.face_value,
        asking_price: v.asking_price,
        ticket_type: emptyToNull(v.ticket_type),
        seat_info: emptyToNull(v.seat_info),
        notes: emptyToNull(v.notes),
        split_allowed: v.split_allowed,
      });
    } catch (err) {
      // the mutation hook already toasted the translated message; add the inline hint where it helps
      const { code } = parseApiError(err);
      if (code === 'PRICE_ABOVE_FACE_VALUE') {
        setError('asking_price', { type: 'server', message: 'forms.error.aboveFace' }, { shouldFocus: true });
      } else if (code === 'EVENT_NOT_UPCOMING' || code === 'EVENT_NOT_FOUND' || code === 'EVENT_IN_PAST') {
        setError('event_id', { type: 'server', message: `errors.${code}` });
      }
      return;
    }
    if (proofFile) {
      const ok = await uploadFor(listing, proofFile);
      if (!ok) {
        setCreated(listing);
        return;
      }
    }
    finish(listing.event_id);
  };

  const retryProof = async () => {
    if (!created || !proofFile) return;
    setProofError(null);
    if (await uploadFor(created, proofFile)) finish(created.event_id);
  };

  if (created) {
    return (
      <div className={cn('mt-panel space-y-4 p-4 sm:p-5', className)} role="status" data-testid="proof-recovery">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-down" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">{t('forms.sell.proofFailedTitle')}</h2>
            <p className="text-[13px] text-muted-foreground">{t('forms.sell.proofFailedBody')}</p>
          </div>
        </div>
        <ProofUpload
          id="mt-proof-retry"
          file={proofFile}
          onChange={(f) => {
            setProofFile(f);
            setProofError(null);
          }}
          error={proofError}
          uploading={uploadProof.isPending}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-card hover:bg-secondary"
            onClick={() => finish(created.event_id)}
            disabled={uploadProof.isPending}
          >
            {t('forms.sell.continueWithout')}
          </Button>
          <Button type="button" className="h-10" onClick={() => void retryProof()} disabled={!proofFile || uploadProof.isPending}>
            {uploadProof.isPending ? t('forms.proof.uploading') : t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const faceRange = faceValueRange(event);
  const summary =
    asking != null && quantity >= 1
      ? t('forms.sell.summary', {
          tickets: formatTickets(quantity, locale),
          price: formatISK(asking),
          total: formatISK(asking * quantity),
        })
      : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={cn('mt-panel overflow-hidden', className)}>
      {showPhoneGate && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary px-4 py-3 text-[13px] sm:px-5" role="status">
          <ShieldAlert className="h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
          <p className="min-w-0 flex-1">{t('forms.sell.phoneGate')}</p>
          <Button asChild variant="outline" size="sm" className="h-9 bg-card hover:bg-secondary">
            <Link to={href('/eg')}>{t('forms.sell.phoneGateAction')}</Link>
          </Button>
        </div>
      )}

      <FormSection step={1} title={t('forms.step.event')}>
        <EventPicker
          value={event}
          onChange={handleEventChange}
          preselectId={preselectEventId}
          error={errors.event_id?.message}
          disabled={busy}
        />
      </FormSection>

      <FormSection step={2} title={t('forms.step.tickets')}>
        <Field id="mt-quantity" label={t('forms.field.quantity')} hint={t('forms.field.quantityHint')} error={errors.quantity?.message}>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="mt-ticket-type" label={t('forms.listing.ticketType')} optional error={errors.ticket_type?.message}>
            {(p) => (
              <Input
                id={p.id}
                {...register('ticket_type')}
                maxLength={MAX_TICKET_TYPE_LENGTH}
                placeholder={t('forms.listing.ticketTypePlaceholder')}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid || undefined}
                disabled={busy}
                className={cn(inputClass, p.invalid && invalidControlClass)}
              />
            )}
          </Field>
          <Field id="mt-seat-info" label={t('forms.listing.seatInfo')} optional error={errors.seat_info?.message}>
            {(p) => (
              <Input
                id={p.id}
                {...register('seat_info')}
                maxLength={MAX_SEAT_INFO_LENGTH}
                placeholder={t('forms.listing.seatInfoPlaceholder')}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid || undefined}
                disabled={busy}
                className={cn(inputClass, p.invalid && invalidControlClass)}
              />
            )}
          </Field>
        </div>

        <Controller
          name="split_allowed"
          control={control}
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
              <div className="min-w-0">
                <Label htmlFor="mt-split" className="text-[13px] font-medium">
                  {t('forms.listing.splitAllowed')}
                </Label>
                <p id="mt-split-hint" className="mt-1 text-[12px] text-muted-foreground">
                  {field.value ? t('forms.listing.splitAllowedOn') : t('forms.listing.splitAllowedOff')}
                </p>
              </div>
              <Switch
                id="mt-split"
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                aria-describedby="mt-split-hint"
                disabled={busy}
                className="mt-0.5"
              />
            </div>
          )}
        />
      </FormSection>

      <FormSection step={3} title={t('forms.step.price')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="mt-face-value"
            label={t('forms.listing.faceValue')}
            hint={faceRange ? t('forms.event.faceValueHint', { range: faceRange }) : t('forms.listing.faceValueHint')}
            error={errors.face_value?.message}
          >
            {(p) => (
              <Controller
                name="face_value"
                control={control}
                render={({ field }) => (
                  <PriceInput
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
            id="mt-asking-price"
            label={t('forms.listing.askingPrice')}
            hint={face != null ? t('forms.listing.askingPriceCap', { face: formatISK(face) }) : t('forms.listing.askingPriceHint')}
            error={askingError}
          >
            {(p) => (
              <Controller
                name="asking_price"
                control={control}
                render={({ field }) => (
                  <PriceInput
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
        </div>
        {face != null && asking != null && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" aria-live="polite">
            <PriceDelta asking={asking} face={face} pill />
            {summary && <span className="tabular-nums text-muted-foreground">{summary}</span>}
          </div>
        )}
      </FormSection>

      <FormSection step={4} title={t('forms.step.proof')} optional description={t('forms.proof.hint')}>
        <ProofUpload
          id="mt-proof"
          file={proofFile}
          onChange={(f) => {
            setProofFile(f);
            setProofError(null);
          }}
          error={proofError}
          disabled={busy}
          uploading={uploadProof.isPending}
        />
      </FormSection>

      <div className="border-t border-border bg-secondary px-4 py-4 sm:px-5">
        <Field id="mt-notes" label={t('forms.field.notes')} optional error={errors.notes?.message} className="mb-4">
          {(p) => (
            <Textarea
              id={p.id}
              {...register('notes')}
              rows={3}
              maxLength={MAX_LISTING_NOTES_LENGTH}
              placeholder={t('forms.listing.notesPlaceholder')}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              disabled={busy}
              className={cn('bg-background text-[14px]', p.invalid && invalidControlClass)}
            />
          )}
        </Field>
        <Button type="submit" className="h-10 w-full font-semibold sm:w-auto" disabled={busy}>
          {busy ? t('forms.sell.submitting') : t('forms.sell.submit')}
        </Button>
        <p className="mt-2 text-[12px] text-muted-foreground">{t('forms.sell.afterNote')}</p>
      </div>
    </form>
  );
}
