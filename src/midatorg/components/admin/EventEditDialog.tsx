import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useUpdateEvent } from '../../lib/queries';
import { EVENT_CATEGORIES } from '../../lib/constants';
import { MAX_CITY_LENGTH, MAX_TITLE_LENGTH, MAX_VENUE_LENGTH } from '../forms/schemas';
import type { EventCategory, EventStatus, MarketEvent } from '../../lib/types';
import { eventToValues, fromDateTimeLocal, isTixUrl, parseWholeNumber, valuesToPatch, type EventEditValues } from './adminUtils';

const EVENT_STATUSES: EventStatus[] = ['upcoming', 'past', 'cancelled'];

/** Messages are i18n keys under admin.eventEdit.errors.* (translated where rendered). */
const schema = z
  .object({
    // the same limits as the manual event form and the DB checks (mt_events.title is 200)
    title: z.string().trim().min(2, 'title').max(MAX_TITLE_LENGTH, 'title'),
    category: z.enum(EVENT_CATEGORIES as [EventCategory, ...EventCategory[]]),
    venue_name: z.string().trim().max(MAX_VENUE_LENGTH, 'venue'),
    city: z.string().trim().max(MAX_CITY_LENGTH, 'city'),
    starts_at: z.string().refine((v) => fromDateTimeLocal(v) !== null, 'startsAt'),
    face_value_min: z.string().refine((v) => v.trim() === '' || parseWholeNumber(v) !== null, 'face'),
    face_value_max: z.string().refine((v) => v.trim() === '' || parseWholeNumber(v) !== null, 'face'),
    tix_url: z.string().trim().refine((v) => v === '' || isTixUrl(v), 'url'),
    status: z.enum(EVENT_STATUSES as [EventStatus, ...EventStatus[]]),
  })
  .superRefine((v, ctx) => {
    const min = parseWholeNumber(v.face_value_min);
    const max = parseWholeNumber(v.face_value_max);
    if (min != null && max != null && min > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['face_value_max'], message: 'faceOrder' });
    }
  });

export type EventEditDialogProps = {
  event: MarketEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const inputClass = 'h-9 bg-background text-[13px]';

/** Edit title, category, venue, city, start, face value range, tix.is URL and status → updateEvent. */
export function EventEditDialog({ event, open, onOpenChange }: EventEditDialogProps) {
  const t = useT();
  const update = useUpdateEvent();
  const form = useForm<EventEditValues>({
    resolver: zodResolver(schema),
    defaultValues: event ? eventToValues(event) : undefined,
  });
  const { register, handleSubmit, control, reset, formState } = form;

  useEffect(() => {
    if (open && event) reset(eventToValues(event));
  }, [open, event, reset]);

  const err = (name: keyof EventEditValues) => {
    const msg = formState.errors[name]?.message;
    return msg ? t(`admin.eventEdit.errors.${msg}`) : null;
  };

  const submit = handleSubmit((values) => {
    if (!event) return;
    update.mutate(
      { id: event.id, patch: valuesToPatch(values) },
      {
        onSuccess: () => {
          toast.success(t('admin.events.updatedToast'));
          onOpenChange(false);
        },
      },
    );
  });

  const field = (name: keyof EventEditValues, label: string, input: JSX.Element, className?: string) => {
    const message = err(name);
    const id = `mt-event-${name}`;
    return (
      <div className={cn('space-y-1.5', className)}>
        <Label htmlFor={id}>{label}</Label>
        {input}
        {message && (
          <p id={`${id}-error`} className="text-[12px] text-down" role="alert">
            {message}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={update.isPending ? () => undefined : onOpenChange}>
      <DialogContent className="mt-panel max-h-[90vh] max-w-lg overflow-y-auto bg-card p-5">
        <DialogHeader>
          <DialogTitle className="text-base">{t('admin.eventEdit.title')}</DialogTitle>
          <DialogDescription className="text-[13px]">{t('admin.eventEdit.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {field(
            'title',
            t('admin.eventEdit.titleField'),
            <Input id="mt-event-title" {...register('title')} className={inputClass} aria-invalid={!!err('title')} aria-describedby={err('title') ? 'mt-event-title-error' : undefined} />,
            'sm:col-span-2',
          )}
          {field(
            'category',
            t('admin.eventEdit.category'),
            <Controller
              control={control}
              name="category"
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger id="mt-event-category" className={inputClass}>
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
            />,
          )}
          {field(
            'status',
            t('admin.eventEdit.status'),
            <Controller
              control={control}
              name="status"
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger id="mt-event-status" className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`eventStatus.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />,
          )}
          {field('venue_name', t('admin.eventEdit.venue'), <Input id="mt-event-venue_name" {...register('venue_name')} className={inputClass} aria-invalid={!!err('venue_name')} />)}
          {field('city', t('admin.eventEdit.city'), <Input id="mt-event-city" {...register('city')} className={inputClass} aria-invalid={!!err('city')} />)}
          {field(
            'starts_at',
            t('admin.eventEdit.startsAt'),
            <Input id="mt-event-starts_at" type="datetime-local" {...register('starts_at')} className={inputClass} aria-invalid={!!err('starts_at')} />,
            'sm:col-span-2',
          )}
          {field(
            'face_value_min',
            t('admin.eventEdit.faceMin'),
            <Input id="mt-event-face_value_min" type="number" inputMode="numeric" min={0} step={1} {...register('face_value_min')} className={cn(inputClass, 'tabular-nums')} aria-invalid={!!err('face_value_min')} />,
          )}
          {field(
            'face_value_max',
            t('admin.eventEdit.faceMax'),
            <Input id="mt-event-face_value_max" type="number" inputMode="numeric" min={0} step={1} {...register('face_value_max')} className={cn(inputClass, 'tabular-nums')} aria-invalid={!!err('face_value_max')} />,
          )}
          {field(
            'tix_url',
            t('admin.eventEdit.tixUrl'),
            <Input id="mt-event-tix_url" type="url" inputMode="url" placeholder={t('forms.manual.tixUrlPlaceholder')} {...register('tix_url')} className={inputClass} aria-invalid={!!err('tix_url')} />,
            'sm:col-span-2',
          )}
          <DialogFooter className="gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={update.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={update.isPending}>
              {update.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
