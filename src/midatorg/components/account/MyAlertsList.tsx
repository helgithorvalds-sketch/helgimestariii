import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { formatISK } from '../../lib/format';
import { href } from '../../lib/paths';
import { useMyAlerts, useRemoveAlert } from '../../lib/queries';
import type { AlertWithEvent } from '../../lib/types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Money } from '../common/Money';
import { PriceDelta } from '../common/PriceDelta';
import { secondaryButtonClass } from '../common/buttonClasses';
import { EventLine, ListSkeleton, Stat } from './bits';

const smallButton = 'h-10 text-[13px] sm:h-9';

function AlertRow({ alert }: { alert: AlertWithEvent }) {
  const t = useT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useRemoveAlert();
  const { event } = alert;
  const face = event.face_value_max ?? event.face_value_min;

  return (
    <li className="mt-panel p-4" data-testid="my-alert-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <EventLine event={event} />
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-bid">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {alert.max_price != null
            ? t('account.alerts.underPrice', { price: formatISK(alert.max_price) })
            : t('account.alerts.anyPrice')}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Stat label={t('account.alerts.lowestNow')}>
          {event.min_ask != null ? (
            <span className="flex flex-wrap items-center gap-x-2">
              <Money amount={event.min_ask} plain className="font-semibold" />
              <PriceDelta asking={event.min_ask} face={face} short />
            </span>
          ) : (
            <span className="text-muted-foreground">{t('account.alerts.noneForSale')}</span>
          )}
        </Stat>
        <Stat label={t('common.forSale')}>
          {event.tickets_available > 0 ? (
            <span>
              {event.tickets_available} {t(event.tickets_available === 1 ? 'common.ticket' : 'common.tickets')}
            </span>
          ) : (
            <span className="text-muted-foreground">{t('common.dash')}</span>
          )}
        </Stat>
      </dl>

      <div className="mt-3 flex">
        <Button type="button" variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)} onClick={() => setConfirmOpen(true)}>
          <BellOff aria-hidden="true" />
          {t('account.alerts.remove')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('account.alerts.removeConfirmTitle')}
        description={t('account.alerts.removeConfirmBody')}
        confirmLabel={t('common.remove')}
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(alert.event_id, {
            onSuccess: () => {
              toast.success(t('account.alerts.removed'));
              setConfirmOpen(false);
            },
            onError: () => setConfirmOpen(false),
          })
        }
      />
    </li>
  );
}

/** "Vaktanir": events the user follows, the price ceiling they set, and a remove action. */
export function MyAlertsList() {
  const t = useT();
  const query = useMyAlerts();

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={t('account.alerts.empty')}
        body={t('account.alerts.emptyBody')}
        action={
          <Button asChild variant="outline" size="sm" className={cn(smallButton, secondaryButtonClass)}>
            <Link to={href('/')}>{t('account.alerts.browse')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="space-y-3">
      {query.data.map((alert) => (
        <AlertRow key={alert.id} alert={alert} />
      ))}
    </ul>
  );
}
