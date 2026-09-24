import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { getProofSignedUrl } from '../../lib/api/listings';
import { mtKeys, useMyProof } from '../../lib/queries';
import type { DealStatus, DealWithContext } from '../../lib/types';
import { ErrorState } from '../common/ErrorState';
import { secondaryButtonClass } from '../common/buttonClasses';
import { canDownloadProof, type DealRole } from './dealState';

type ProofDownloadProps = {
  deal: DealWithContext;
  /** Effective status (a stale reservation reads as expired). */
  status: DealStatus;
  role: DealRole;
  className?: string;
};

/** Signed URLs live 5 minutes; refresh a little before that so the link never goes stale. */
const SIGNED_URL_REFRESH_MS = 4 * 60_000;

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <section className={cn('mt-panel p-[14px]', className)} aria-labelledby="mt-proof-title">
      <h2 id="mt-proof-title" className="mb-2 text-[16px] font-semibold">
        {t('deals.proof.title')}
      </h2>
      {children}
    </section>
  );
}

function BuyerProof({ listingId, className }: { listingId: string; className?: string }) {
  const t = useT();
  const q = useQuery({
    queryKey: mtKeys.proofUrl(listingId),
    queryFn: () => getProofSignedUrl(listingId),
    staleTime: SIGNED_URL_REFRESH_MS,
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });

  return (
    <Panel className={className}>
      {q.isPending ? (
        <Skeleton className="h-10 w-48 bg-secondary" aria-busy="true" />
      ) : q.isError ? (
        <ErrorState error={q.error} body={t('deals.proof.error')} retry={() => void q.refetch()} />
      ) : q.data ? (
        <div className="space-y-2">
          <Button asChild variant="outline" className={cn('h-10 text-[13px] font-semibold sm:h-9', secondaryButtonClass)}>
            <a href={q.data} target="_blank" rel="noopener noreferrer" data-testid="proof-link">
              <FileText className="h-4 w-4" aria-hidden="true" />
              {t('deals.proof.open')}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </a>
          </Button>
          <p className="text-[12px] text-muted-foreground">{t('deals.proof.buyerHint')}</p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground" role="status">
          {t('deals.proof.none')}
        </p>
      )}
    </Panel>
  );
}

function SellerProof({ listingId, className }: { listingId: string; className?: string }) {
  const t = useT();
  const q = useMyProof(listingId);
  return (
    <Panel className={className}>
      {q.isPending ? (
        <Skeleton className="h-5 w-40 bg-secondary" aria-busy="true" />
      ) : q.isError ? (
        <ErrorState error={q.error} body={t('deals.proof.error')} retry={() => void q.refetch()} />
      ) : q.data ? (
        <div className="flex items-start gap-2 text-[13px]">
          <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" aria-hidden="true" />
          <div>
            <p className="font-medium" data-testid="proof-uploaded">
              {t('deals.proof.uploaded')}
            </p>
            <p className="text-muted-foreground">{t('deals.proof.uploadedBody')}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-[13px]">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-2">
            <div>
              <p className="font-medium">{t('deals.proof.missing')}</p>
              <p className="text-muted-foreground">{t('deals.proof.missingBody')}</p>
            </div>
            <Button asChild variant="outline" size="sm" className={secondaryButtonClass}>
              <Link to={href('/eg')}>{t('deals.proof.goToListings')}</Link>
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/**
 * Buyer: from ticket_sent on, a real link to a short-lived signed URL of the
 * seller's proof (`getProofSignedUrl`), or a note that none was uploaded.
 * Seller: whether their proof is on file. Admins and outsiders see nothing.
 */
export function ProofDownload({ deal, status, role, className }: ProofDownloadProps) {
  if (role === 'buyer') {
    if (!canDownloadProof(status, role)) return null;
    return <BuyerProof listingId={deal.listing_id} className={className} />;
  }
  if (role === 'seller') return <SellerProof listingId={deal.listing_id} className={className} />;
  return null;
}
