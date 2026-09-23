import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertTriangle, FileText, Image as ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLocale, useT } from '../../lib/i18n';
import { formatFileSize, hashFile, shortHash, validateProofFile, type ProofFileError } from './schemas';

export type ProofUploadProps = {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  /** A ready sentence (e.g. the DUPLICATE_PROOF explanation) shown as an alert under the file. */
  error?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  describedBy?: string;
  className?: string;
};

const ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';

/**
 * Drag & drop / file picker for the ticket proof (PDF/PNG/JPG ≤ 10 MB). Shows the
 * file name, size and the first 8 hex characters of its SHA-256 so the seller
 * can see the same fingerprint the duplicate check uses.
 */
export function ProofUpload({ id, file, onChange, error, disabled, uploading, describedBy, className }: ProofUploadProps) {
  const t = useT();
  const [locale] = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<ProofFileError | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!file) {
      setHash(null);
      return;
    }
    let active = true;
    setHash(null);
    hashFile(file)
      .then((h) => {
        if (active) setHash(h);
      })
      .catch(() => {
        if (active) setHash(null);
      });
    return () => {
      active = false;
    };
  }, [file]);

  const pick = (candidate: File | null | undefined) => {
    if (!candidate) return;
    const problem = validateProofFile(candidate);
    if (problem) {
      setLocalError(problem);
      onChange(null);
      return;
    }
    setLocalError(null);
    onChange(candidate);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    pick(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    pick(e.dataTransfer?.files?.[0]);
  };

  const clear = () => {
    setLocalError(null);
    onChange(null);
    inputRef.current?.focus();
  };

  const errorId = `${id}-file-error`;
  const localErrorText = localError ? t(`errors.${localError}`) : null;
  const described = [describedBy, localErrorText || error ? errorId : null].filter(Boolean).join(' ') || undefined;
  const Icon = file?.type === 'application/pdf' ? FileText : ImageIcon;

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={handleInput}
        disabled={disabled}
        aria-label={t('forms.proof.label')}
        aria-describedby={described}
        aria-invalid={!!(localErrorText || error) || undefined}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold" title={file.name}>
              {file.name}
            </p>
            <p className="text-[12px] text-muted-foreground">
              <span className="tabular-nums">{formatFileSize(file.size, locale)}</span>
              <span aria-hidden="true"> · </span>
              {hash ? (
                <span>
                  {t('forms.proof.fingerprint')} <span className="mt-mono text-foreground">{shortHash(hash)}</span>
                </span>
              ) : (
                <span>{t('forms.proof.hashing')}</span>
              )}
            </p>
            {uploading && <p className="mt-1 text-[12px] text-muted-foreground">{t('forms.proof.uploading')}</p>}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={clear}
            disabled={disabled || uploading}
            aria-label={t('forms.proof.remove')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          data-testid="proof-dropzone"
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-background',
            disabled && 'opacity-50',
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-[13px] text-muted-foreground">{t('forms.proof.drop')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 bg-card hover:bg-surface-2"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            aria-describedby={described}
          >
            {t('forms.proof.choose')}
          </Button>
          <p className="text-[12px] text-muted-foreground">{t('forms.proof.formats')}</p>
        </div>
      )}

      {localErrorText && (
        <p id={errorId} className="text-[12px] font-medium text-down">
          {localErrorText}
        </p>
      )}
      {!localErrorText && error && (
        <div id={errorId} role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-card p-3 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-down" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
