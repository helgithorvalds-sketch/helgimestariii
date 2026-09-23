import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { parseApiError } from '../../lib/errors';
import { href } from '../../lib/paths';
import { useFetchTixEvent, useRunTixImport } from '../../lib/queries';
import { isTixUrl } from './adminUtils';

/** "Flytja inn frá tix.is": one-event URL box → mt-fetch-tix-event, and "Keyra innflutning núna" → mt-import-tix. */
export function ImportPanel({ className }: { className?: string }) {
  const t = useT();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const fetchEvent = useFetchTixEvent();
  const runImport = useRunTixImport();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!isTixUrl(value)) {
      setUrlError(t('admin.import.invalidUrl'));
      return;
    }
    setUrlError(null);
    fetchEvent.mutate(value, { onSuccess: () => setUrl('') });
  };

  const result = runImport.data;

  return (
    <section className={cn('mt-panel p-4', className)} aria-labelledby="mt-import-title">
      <h2 id="mt-import-title" className="text-[14px] font-semibold">
        {t('admin.import.title')}
      </h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">{t('admin.import.description')}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-2" noValidate>
          <Label htmlFor="mt-import-url">{t('admin.import.urlLabel')}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="mt-import-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              placeholder={t('admin.import.urlPlaceholder')}
              className="h-10 bg-background text-[13px] sm:h-9"
              aria-invalid={!!urlError}
              aria-describedby={urlError ? 'mt-import-url-error' : undefined}
              disabled={fetchEvent.isPending}
            />
            <Button type="submit" size="sm" className="h-10 shrink-0 gap-1.5 sm:h-9" disabled={fetchEvent.isPending}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {fetchEvent.isPending ? t('admin.import.fetching') : t('admin.import.fetch')}
            </Button>
          </div>
          {urlError && (
            <p id="mt-import-url-error" className="text-[12px] text-down" role="alert">
              {urlError}
            </p>
          )}
          {fetchEvent.isSuccess && (
            <p className="flex items-center gap-1.5 text-[13px]" role="status">
              <CheckCircle2 className="h-4 w-4 text-up" aria-hidden="true" />
              {t('admin.import.fetched')}
              <Link to={href('/vidburdir/' + fetchEvent.data.eventId)} className="font-medium underline underline-offset-2">
                {t('admin.import.openEvent')}
              </Link>
            </p>
          )}
          {fetchEvent.isError && (
            <p className="flex items-center gap-1.5 text-[13px] text-down" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {t(parseApiError(fetchEvent.error).key)}
            </p>
          )}
        </form>

        <div className="space-y-2 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-1.5 sm:h-9"
            onClick={() => runImport.mutate()}
            disabled={runImport.isPending}
          >
            <RefreshCw className={cn('h-4 w-4', runImport.isPending && 'animate-spin')} aria-hidden="true" />
            {runImport.isPending ? t('admin.import.running') : t('admin.import.run')}
          </Button>
          <p className="text-[12px] text-muted-foreground">{t('admin.import.runHint')}</p>

          {result && (
            <div className="mt-panel bg-surface-2/60 p-3" role="status">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                <CheckCircle2 className="h-4 w-4 text-up" aria-hidden="true" />
                {t('admin.import.done')}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ['scanned', result.scanned],
                    ['inserted', result.inserted],
                    ['updated', result.updated],
                    ['errors', result.errors?.length ?? 0],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key}>
                    <dt className="mt-eyebrow">{t(`admin.import.${key}`)}</dt>
                    <dd className={cn('text-[22px] font-semibold tabular-nums leading-tight', key === 'errors' && value > 0 && 'text-down')}>{value}</dd>
                  </div>
                ))}
              </dl>
              {result.errors && result.errors.length > 0 && (
                <details className="mt-2 text-[12.5px]">
                  <summary className="cursor-pointer text-muted-foreground">{t('admin.import.errorList')}</summary>
                  <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5">
                    {result.errors.map((err, i) => (
                      <li key={i} className="break-words">
                        {err}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {runImport.isError && (
            <p className="flex items-center gap-1.5 text-[13px] text-down" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {t('admin.import.failed')}: {t(parseApiError(runImport.error).key)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
