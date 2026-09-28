import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatTickets } from '../../lib/format';
import { href } from '../../lib/paths';
import { useCancelRequest, useMyRequests } from '../../lib/queries';
import type { RequestWithEvent } from '../../lib/types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Money } from '../common/Money';
import { bidButtonClass, secondaryButtonClass } from '../common/buttonClasses';
import { EventLine, ListSkeleton, Stat, StatusTag } from './bits';
import { requestStatusTone } from './logic';

const smallButton = 'h-10 text-[13px] sm:h-9';

function RequestRow({ request }: { request: RequestWithEvent }) {
  const t = useT();
  const [locale] = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancel = useCancelRequest();

  return (
    <li className="mt-panel p-4" data-testid="my-request-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <EventLine event={request.event} />
        <StatusTag label={t(`requestStatus.${request.status}`)} tone={requestStatusTone(request.status)} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t('account.requests.quantity')}>{formatTickets(request.quantity, locale)}</Stat>
        <Stat label={t('account.requests.maxPrice')}>
          {request.max_price != null ? (
            <Money amount={request.max_price} plain className="font-semibold" />
          ) : (
            <span className="text-muted-foreground">{t('account.requests.noMax')}</span>
          )}
        </Stat>
        {request.notes && (
          <Stat label={t('account.requests.notes')} className="col-span-2 sm:col-span-1">
            <span className="line-clamp-2 whitespace-pre-line">{request.notes}</span>
          </Stat>
        )}
      </dl>

      {request.status === 'active' && (
        <div className="mt-3 flex">
          <Button type="button" variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)} onClick={() => setConfirmOpen(true)}>
            <X aria-hidden="true" />
            {t('account.requests.cancel')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('account.requests.cancelConfirmTitle')}
        description={t('account.requests.cancelConfirmBody')}
        confirmLabel={t('account.requests.cancel')}
        destructive
        loading={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(request.id, {
            onSuccess: () => {
              toast.success(t('account.requests.cancelled'));
              setConfirmOpen(false);
            },
            onError: () => setConfirmOpen(false),
          })
        }
      />
    </li>
  );
}

/** "Óskir": the signed-in user's ticket requests with status and cancel. */
export function MyRequestsList() {
  const t = useT();
  const query = useMyRequests();

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={t('account.requests.empty')}
        body={t('account.requests.emptyBody')}
        action={
          <Button asChild variant="outline" size="sm" className={cn(smallButton, 'font-semibold', bidButtonClass)}>
            <Link to={href('/oska')}>{t('nav.want')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="space-y-3">
      {query.data.map((request) => (
        <RequestRow key={request.id} request={request} />
      ))}
    </ul>
  );
}
