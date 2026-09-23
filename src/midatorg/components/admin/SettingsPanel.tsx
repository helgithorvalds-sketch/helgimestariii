import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatRelative } from '../../lib/format';
import { useSetSetting, useSettings } from '../../lib/queries';
import type { Json, Setting } from '../../lib/types';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { RowsSkeleton } from './AdminBits';
import {
  BOOLEAN_SETTING_KEYS,
  LIST_SETTING_KEYS,
  NUMBER_SETTING_KEYS,
  isKnownSettingKey,
  parseEmailList,
  parseWholeNumber,
  settingBoolean,
  settingNumber,
  settingStringList,
  type BooleanSettingKey,
  type ListSettingKey,
  type NumberSettingKey,
} from './adminUtils';

type SaveFn = (key: string, value: Json, onDone: () => void) => void;

function Row({ id, label, hint, updatedAt, control, error }: { id: string; label: string; hint: string; updatedAt?: string | null; control: React.ReactNode; error?: string | null }) {
  const t = useT();
  const [locale] = useLocale();
  return (
    <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13.5px] font-semibold">
          {label}
        </Label>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>
        {updatedAt && <p className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">{t('admin.settings.updatedAgo', { ago: formatRelative(updatedAt, locale) })}</p>}
        {error && (
          <p id={`${id}-error`} className="mt-1 text-[12px] text-down" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="sm:min-w-[240px]">{control}</div>
    </div>
  );
}

function NumberRow({ setting, settingKey, save, saving }: { setting?: Setting; settingKey: NumberSettingKey; save: SaveFn; saving: boolean }) {
  const t = useT();
  const current = settingNumber(setting?.value);
  const [text, setText] = useState(current == null ? '' : String(current));
  useEffect(() => setText(current == null ? '' : String(current)), [current]);
  const parsed = parseWholeNumber(text, 1);
  const dirty = text.trim() !== (current == null ? '' : String(current));
  const invalid = dirty && parsed == null;
  const id = `mt-setting-${settingKey}`;
  return (
    <Row
      id={id}
      label={t(`admin.settings.key.${settingKey}`)}
      hint={t(`admin.settings.hint.${settingKey}`)}
      updatedAt={setting?.updated_at}
      error={invalid ? t('admin.settings.invalidNumber') : null}
      control={
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (parsed != null && dirty) save(settingKey, parsed, () => undefined);
          }}
        >
          <div className="relative flex-1">
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={cn('h-10 bg-background pr-12 text-[13px] tabular-nums sm:h-9', invalid && 'border-destructive')}
              aria-invalid={invalid}
              aria-describedby={invalid ? `${id}-error` : undefined}
            />
            {settingKey === 'reservation_minutes' && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">{t('admin.settings.unit.minutes')}</span>
            )}
          </div>
          <Button type="submit" size="sm" className="h-10 sm:h-9" disabled={!dirty || parsed == null || saving}>
            {t('common.save')}
          </Button>
        </form>
      }
    />
  );
}

function BooleanRow({ setting, settingKey, save, saving }: { setting?: Setting; settingKey: BooleanSettingKey; save: SaveFn; saving: boolean }) {
  const t = useT();
  const current = settingBoolean(setting?.value);
  const id = `mt-setting-${settingKey}`;
  return (
    <Row
      id={id}
      label={t(`admin.settings.key.${settingKey}`)}
      hint={t(`admin.settings.hint.${settingKey}`)}
      updatedAt={setting?.updated_at}
      control={
        <div className="flex h-10 items-center gap-3 sm:h-9 sm:justify-end">
          <span className="text-[12.5px] text-muted-foreground">{t(current ? 'admin.settings.on' : 'admin.settings.off')}</span>
          <Switch id={id} checked={current} disabled={saving} onCheckedChange={(checked) => save(settingKey, checked, () => undefined)} />
        </div>
      }
    />
  );
}

function ListRow({ setting, settingKey, save, saving }: { setting?: Setting; settingKey: ListSettingKey; save: SaveFn; saving: boolean }) {
  const t = useT();
  const current = settingStringList(setting?.value);
  const currentText = current.join('\n');
  const [text, setText] = useState(currentText);
  useEffect(() => setText(currentText), [currentText]);
  const { emails, invalid } = parseEmailList(text);
  const dirty = emails.join('\n') !== currentText || invalid.length > 0;
  const id = `mt-setting-${settingKey}`;
  return (
    <Row
      id={id}
      label={t(`admin.settings.key.${settingKey}`)}
      hint={t(`admin.settings.hint.${settingKey}`)}
      updatedAt={setting?.updated_at}
      error={invalid.length > 0 ? t('admin.settings.invalidEmails', { list: invalid.join(', ') }) : null}
      control={
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (invalid.length === 0 && dirty) save(settingKey, emails, () => undefined);
          }}
        >
          <Textarea
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(8, Math.max(3, current.length + 1))}
            spellCheck={false}
            className={cn('bg-background text-[13px]', invalid.length > 0 && 'border-destructive')}
            aria-invalid={invalid.length > 0}
            aria-describedby={invalid.length > 0 ? `${id}-error` : undefined}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-10 sm:h-9" disabled={!dirty || invalid.length > 0 || saving}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      }
    />
  );
}

/** Settings tab: editable mt_settings values (numbers, the require-phone switch, admin e-mail list) → setSetting. */
export function SettingsPanel() {
  const t = useT();
  const settings = useSettings();
  const setSetting = useSetSetting();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const save: SaveFn = (key, value, onDone) => {
    setSavingKey(key);
    setSetting.mutate(
      { key, value },
      {
        onSuccess: () => toast.success(t('admin.settings.savedToast')),
        onSettled: () => {
          setSavingKey(null);
          onDone();
        },
      },
    );
  };

  if (settings.isPending) return <RowsSkeleton rows={7} />;
  if (settings.isError) return <ErrorState error={settings.error} retry={() => void settings.refetch()} />;
  if (settings.data.length === 0) {
    return <EmptyState icon={SlidersHorizontal} title={t('admin.settings.empty')} body={t('admin.settings.emptyBody')} />;
  }

  const byKey = new Map(settings.data.map((s) => [s.key, s]));
  const unknown = settings.data.filter((s) => !isKnownSettingKey(s.key));

  return (
    <section className="space-y-4" aria-label={t('admin.tab.settings')}>
      <p className="text-[12.5px] text-muted-foreground">{t('admin.settings.description')}</p>
      <div className="mt-panel divide-y divide-border">
        {NUMBER_SETTING_KEYS.map((key) => (
          <NumberRow key={key} settingKey={key} setting={byKey.get(key)} save={save} saving={savingKey === key} />
        ))}
        {BOOLEAN_SETTING_KEYS.map((key) => (
          <BooleanRow key={key} settingKey={key} setting={byKey.get(key)} save={save} saving={savingKey === key} />
        ))}
        {LIST_SETTING_KEYS.map((key) => (
          <ListRow key={key} settingKey={key} setting={byKey.get(key)} save={save} saving={savingKey === key} />
        ))}
      </div>

      {unknown.length > 0 && (
        <div className="mt-panel">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-[14px] font-semibold">{t('admin.settings.other')}</h3>
            <p className="text-[12.5px] text-muted-foreground">{t('admin.settings.otherHint')}</p>
          </div>
          <dl className="divide-y divide-border">
            {unknown.map((s) => (
              <div key={s.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                <dt className="mt-mono text-[12.5px]">{s.key}</dt>
                <dd className="mt-mono break-all text-[12.5px] text-muted-foreground">{JSON.stringify(s.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
