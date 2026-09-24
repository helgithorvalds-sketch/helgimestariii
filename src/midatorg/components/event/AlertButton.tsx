import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth, loginHref } from '../../lib/auth';
import { formatISK } from '../../lib/format';
import { mtKeys, useMyAlert, useRemoveAlert, useUpsertAlert } from '../../lib/queries';
import { ghostButtonClass } from '../common/buttonClasses';

export type AlertButtonProps = {
  eventId: string;
  /** Caps the optional max price. */
  faceValue?: number | null;
  /** Open the popover as soon as the signed-in user is known (`?vakta=1`). */
  autoOpen?: boolean;
  /** Icon-only (sticky phone bar). */
  compact?: boolean;
  className?: string;
};

type ParsedMax = { ok: true; value: number | null } | { ok: false; message: string };

/** Adds `vakta=1` to the current URL so the popover reopens after signing in. */
function withVakta(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.set('vakta', '1');
  return `${pathname}?${params.toString()}`;
}

/**
 * "Láta mig vita" / "Fylgist með" (aria-pressed). Signed out → login with a return URL.
 * Signed in → popover with an optional max price; upsertAlert / removeAlert.
 */
export function AlertButton({ eventId, faceValue = null, autoOpen = false, compact = false, className }: AlertButtonProps) {
  const t = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const alertQ = useMyAlert(user ? eventId : undefined);
  const upsert = useUpsertAlert();
  const remove = useRemoveAlert();
  const [open, setOpen] = useState(false);
  const [maxInput, setMaxInput] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const autoOpened = useRef(false);

  const alert = alertQ.data ?? null;
  const following = !!alert;
  const busy = upsert.isPending || remove.isPending;

  // seed the input from the stored alert every time the popover opens
  useEffect(() => {
    if (open) {
      setMaxInput(alert?.max_price != null ? String(alert.max_price) : '');
      setValidation(null);
    }
  }, [open, alert]);

  useEffect(() => {
    if (autoOpen && user && !loading && !autoOpened.current) {
      autoOpened.current = true;
      setOpen(true);
    }
  }, [autoOpen, user, loading]);

  const label = following ? t('event.alert.following') : t('event.alert.button');
  const Icon = following ? BellRing : Bell;
  const buttonClass = cn(
    'h-11 rounded-lg text-[14px] font-semibold sm:h-10',
    ghostButtonClass,
    following && 'bg-accent text-accent-foreground',
    compact ? 'w-11 px-0 sm:w-10' : 'px-3',
    className,
  );

  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={buttonClass}
        aria-label={compact ? label : undefined}
        onClick={() => navigate(loginHref(withVakta(location.pathname, location.search)))}
      >
        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
        {!compact && label}
      </Button>
    );
  }

  const parseMax = (): ParsedMax => {
    const raw = maxInput.trim().replace(/\./g, '').replace(/\s/g, '');
    if (raw === '') return { ok: true, value: null };
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, message: t('event.alert.maxInvalid') };
    if (faceValue != null && n > faceValue) return { ok: false, message: t('event.alert.maxAboveFace', { price: formatISK(faceValue) }) };
    return { ok: true, value: n };
  };

  const save = () => {
    const parsed = parseMax();
    if (parsed.ok === false) {
      setValidation(parsed.message);
      return;
    }
    setValidation(null);
    upsert.mutate(
      { eventId, maxPrice: parsed.value },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: mtKeys.myAlert(eventId) });
          toast.success(t('event.alert.saved'));
          setOpen(false);
        },
      },
    );
  };

  const stop = () => {
    remove.mutate(eventId, {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: mtKeys.myAlert(eventId) });
        toast.success(t('event.alert.removed'));
        setOpen(false);
      },
    });
  };

  return (
    <Popover open={open} onOpenChange={busy ? () => undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={buttonClass} aria-pressed={following} aria-label={compact ? label : undefined}>
          <Icon className={cn('h-[15px] w-[15px]', following && 'text-bid')} aria-hidden="true" />
          {!compact && label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="mt-panel w-80 rounded-xl bg-popover p-4 shadow-lg">
        <div className="space-y-3">
          <div>
            <p className="text-[14px] font-semibold">{t('event.alert.title')}</p>
            <p className="text-[12.5px] text-muted-foreground">{t('event.alert.body')}</p>
            {following && (
              <p className="mt-1 text-[12px] text-foreground" data-testid="alert-current">
                {alert?.max_price != null ? t('event.alert.currentMax', { price: formatISK(alert.max_price) }) : t('event.alert.currentAny')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-alert-max" className="text-[13px]">
              {t('event.alert.maxLabel')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <div className="relative">
              <Input
                id="mt-alert-max"
                type="text"
                inputMode="numeric"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                placeholder={faceValue != null ? formatISK(faceValue).replace(' kr.', '') : ''}
                aria-describedby="mt-alert-max-help"
                aria-invalid={validation ? true : undefined}
                className={cn('h-10 bg-background pr-10 text-[14px] tabular-nums', validation && 'border-destructive')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">{t('common.kr')}</span>
            </div>
            <p id="mt-alert-max-help" className={cn('text-[12px]', validation ? 'text-down' : 'text-muted-foreground')}>
              {validation ?? t('event.alert.maxHelp')}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {following && (
              <Button type="button" variant="outline" size="sm" className="h-10 rounded-lg" onClick={stop} disabled={busy}>
                {t('event.alert.remove')}
              </Button>
            )}
            <Button type="button" size="sm" className="h-10 rounded-lg font-semibold" onClick={save} disabled={busy}>
              {busy ? t('common.saving') : following ? t('event.alert.update') : t('event.alert.save')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
