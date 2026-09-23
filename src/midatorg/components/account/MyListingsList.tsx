import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileCheck2, FileX2, Pencil, Tag, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate, formatISK } from '../../lib/format';
import { href } from '../../lib/paths';
import { useCancelListing, useMyListings, useMyProof, useUpdateListing, useUploadProof } from '../../lib/queries';
import type { ListingWithEvent } from '../../lib/types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Money } from '../common/Money';
import { PriceDelta } from '../common/PriceDelta';
import { secondaryButtonClass } from '../common/buttonClasses';
import { authInputClass, FieldMessage } from './AuthForm';
import { EventLine, ListSkeleton, Stat, StatusTag } from './bits';
import { checkProofFile, listingStatusTone, validateAskingPrice } from './logic';

const smallButton = 'h-10 text-[13px] sm:h-9';

function PriceEditor({ listing, onClose }: { listing: ListingWithEvent; onClose: () => void }) {
  const t = useT();
  const update = useUpdateListing();
  const [value, setValue] = useState(String(listing.asking_price));
  const [error, setError] = useState<string | null>(null);
  const preview = validateAskingPrice(value, listing.face_value);
  const inputId = `mt-price-${listing.id}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const check = validateAskingPrice(value, listing.face_value);
    if (check.ok === false) {
      setError(t(check.key, { face: formatISK(listing.face_value) }));
      return;
    }
    setError(null);
    update.mutate(
      { id: listing.id, patch: { asking_price: check.price } },
      {
        onSuccess: () => {
          toast.success(t('account.listings.priceSaved'));
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mt-3 rounded-lg border border-border bg-surface-2/60 p-3">
      <Label htmlFor={inputId}>{t('account.listings.newPrice')}</Label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <div className="relative w-40">
          <Input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            className={cn(authInputClass, 'pr-9 tabular-nums', error && 'border-destructive')}
            aria-invalid={!!error}
            aria-describedby={cn(`${inputId}-hint`, error && `${inputId}-error`)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
            {t('common.kr')}
          </span>
        </div>
        {preview.ok && <PriceDelta asking={preview.price} face={listing.face_value} pill />}
      </div>
      <p id={`${inputId}-hint`} className="mt-1.5 text-[12px] text-muted-foreground">
        {t('account.listings.priceHint', { face: formatISK(listing.face_value) })}
      </p>
      <FieldMessage id={`${inputId}-error`} message={error} className="mt-1" />
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" className={cn(smallButton, 'font-semibold')} disabled={update.isPending}>
          {update.isPending ? t('common.saving') : t('common.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" className={smallButton} onClick={onClose} disabled={update.isPending}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

function ProofUploader({ listingId }: { listingId: string }) {
  const t = useT();
  const [locale] = useLocale();
  const proof = useMyProof(listingId);
  const upload = useUploadProof();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `mt-proof-${listingId}`;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkProofFile(file);
    if (problem) {
      toast.error(t(`errors.${problem}`));
      return;
    }
    upload.mutate({ listingId, file }, { onSuccess: () => toast.success(t('account.listings.proofSaved')) });
  };

  const hasProof = !!proof.data;
  const StatusIcon = hasProof ? FileCheck2 : FileX2;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[12px]">
          <StatusIcon className={cn('h-4 w-4 shrink-0', hasProof ? 'text-up' : 'text-muted-foreground')} aria-hidden="true" />
          <span className="font-semibold">{t('account.listings.proof')}:</span>
          <span className="text-muted-foreground">
            {proof.isPending
              ? t('common.loading')
              : proof.isError
                ? t('common.errorTitle')
                : proof.data
                  ? t('account.listings.proofUploaded', { date: formatDate(proof.data.created_at, locale) })
                  : t('account.listings.proofMissing')}
          </span>
        </div>
        <div>
          <label htmlFor={inputId} className="sr-only">
            {t('account.listings.uploadProof')}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={onFile}
            disabled={upload.isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(smallButton, secondaryButtonClass)}
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            <Upload aria-hidden="true" />
            {upload.isPending
              ? t('account.common.uploading')
              : hasProof
                ? t('account.listings.replaceProof')
                : t('account.listings.uploadProof')}
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{t('account.listings.proofHint')}</p>
    </div>
  );
}

function MyListingRow({ listing }: { listing: ListingWithEvent }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancel = useCancelListing();
  const isActive = listing.status === 'active';
  const canProof = listing.status === 'active' || listing.status === 'reserved';
  const seat = [listing.ticket_type, listing.seat_info].filter(Boolean).join(' · ');

  return (
    <li className="mt-panel p-4" data-testid="my-listing-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <EventLine event={listing.event} />
        <StatusTag label={t(`listingStatus.${listing.status}`)} tone={listingStatusTone(listing.status)} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('account.listings.quantity')}>
          {t('account.listings.remaining', { remaining: listing.quantity_remaining, total: listing.quantity })}
        </Stat>
        <Stat label={t('common.askingPrice')}>
          <span className="flex flex-wrap items-center gap-x-2">
            <Money amount={listing.asking_price} plain className="font-semibold" />
            <PriceDelta asking={listing.asking_price} face={listing.face_value} short />
          </span>
        </Stat>
        <Stat label={t('common.faceValue')}>
          <Money amount={listing.face_value} plain />
        </Stat>
        <Stat label={t('account.listings.seat')}>{seat || t('common.dash')}</Stat>
      </dl>

      {editing && <PriceEditor listing={listing} onClose={() => setEditing(false)} />}

      {isActive && !editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)} onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            {t('account.listings.editPrice')}
          </Button>
          <Button type="button" variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)} onClick={() => setConfirmOpen(true)}>
            <X aria-hidden="true" />
            {t('account.listings.cancel')}
          </Button>
        </div>
      )}

      {canProof && <ProofUploader listingId={listing.id} />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('account.listings.cancelConfirmTitle')}
        description={t('account.listings.cancelConfirmBody')}
        confirmLabel={t('account.listings.cancel')}
        destructive
        loading={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(listing.id, {
            onSuccess: () => {
              toast.success(t('account.listings.cancelled'));
              setConfirmOpen(false);
            },
            onError: () => setConfirmOpen(false),
          })
        }
      />
    </li>
  );
}

/** "Mínar sölur": every listing of the signed-in user with status, inline price edit, cancel and proof upload. */
export function MyListingsList() {
  const t = useT();
  const query = useMyListings();

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title={t('account.listings.empty')}
        body={t('account.listings.emptyBody')}
        action={
          <Button asChild size="sm" className={cn(smallButton, 'font-semibold')}>
            <Link to={href('/selja')}>{t('nav.sell')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="space-y-3">
      {query.data.map((listing) => (
        <MyListingRow key={listing.id} listing={listing} />
      ))}
    </ul>
  );
}
