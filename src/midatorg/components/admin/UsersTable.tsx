import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, Shield, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatMonthYear } from '../../lib/format';
import { href } from '../../lib/paths';
import { useAdminUsers, useSetBan, useSetVerification } from '../../lib/queries';
import { VERIFICATION_LEVELS } from '../../lib/constants';
import type { Profile, VerificationLevel } from '../../lib/types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { RatingStars } from '../common/RatingStars';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { useDebouncedValue, usePublicProfilesMap } from './adminQueries';
import { AdminSearch, Pill, RowsSkeleton, tdClass, thClass } from './AdminBits';

type BanTarget = { user: Profile; banned: boolean };

/** Users tab: search by name / id, verification select, ban / unban with a reason dialog. */
export function UsersTable() {
  const t = useT();
  const [locale] = useLocale();
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q);
  const users = useAdminUsers(query);
  const ids = useMemo(() => (users.data ?? []).map((u) => u.id), [users.data]);
  const stats = usePublicProfilesMap(ids);
  const setBan = useSetBan();
  const setVerification = useSetVerification();
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [reason, setReason] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const openBan = (user: Profile, banned: boolean) => {
    setReason('');
    setBanTarget({ user, banned });
  };

  const confirmBan = () => {
    if (!banTarget) return;
    const { user, banned } = banTarget;
    setBan.mutate(
      { userId: user.id, banned, reason: banned ? reason.trim() || null : null },
      {
        onSuccess: () => {
          toast.success(t(banned ? 'admin.users.bannedToast' : 'admin.users.unbannedToast'));
          setBanTarget(null);
        },
      },
    );
  };

  const changeVerification = (user: Profile, level: VerificationLevel) => {
    if (level === user.verification) return;
    setVerifyingId(user.id);
    setVerification.mutate(
      { userId: user.id, level },
      {
        onSuccess: () => toast.success(t('admin.users.verificationToast')),
        onSettled: () => setVerifyingId(null),
      },
    );
  };

  return (
    <section className="space-y-3" aria-label={t('admin.tab.users')}>
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearch
          id="mt-admin-user-search"
          label={t('admin.users.searchLabel')}
          placeholder={t('admin.users.searchPlaceholder')}
          value={q}
          onChange={setQ}
          className="w-full sm:max-w-sm"
        />
        {users.data && <p className="text-[12px] tabular-nums text-muted-foreground">{t('admin.count', { count: users.data.length })}</p>}
      </div>

      {users.isPending ? (
        <RowsSkeleton />
      ) : users.isError ? (
        <ErrorState error={users.error} retry={() => void users.refetch()} />
      ) : users.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('admin.users.empty')}
          body={t('admin.users.emptyBody')}
          action={
            q && (
              <Button type="button" variant="outline" size="sm" onClick={() => setQ('')}>
                {t('admin.users.clearSearch')}
              </Button>
            )
          }
        />
      ) : (
        <div className="mt-panel overflow-hidden">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className={thClass}>{t('admin.users.col.name')}</TableHead>
                <TableHead className={thClass}>{t('admin.users.col.verification')}</TableHead>
                <TableHead className={thClass}>{t('admin.users.col.rating')}</TableHead>
                <TableHead className={cn(thClass, 'text-right')}>{t('admin.users.col.sales')}</TableHead>
                <TableHead className={thClass}>{t('admin.users.col.banned')}</TableHead>
                <TableHead className={cn(thClass, 'text-right')}>{t('admin.users.col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((u) => {
                const s = stats.data?.get(u.id);
                const banned = !!u.banned_at;
                return (
                  <TableRow key={u.id} className="border-border hover:bg-surface-2/40" data-testid="user-row">
                    <TableCell className={tdClass}>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar profile={u} size="sm" />
                        <div className="min-w-0">
                          <Link
                            to={href('/notendur/' + u.id)}
                            className="block truncate font-semibold text-foreground underline-offset-2 hover:underline"
                            title={t('admin.users.openProfile')}
                          >
                            {u.display_name}
                          </Link>
                          <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                            <span>{t('admin.users.memberSince', { date: formatMonthYear(u.created_at, locale) })}</span>
                            {u.role === 'admin' && (
                              <Pill tone="verified" className="gap-1">
                                <Shield className="h-3 w-3" aria-hidden="true" />
                                {t('admin.users.admin')}
                              </Pill>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={tdClass}>
                      <div className="flex items-center gap-2">
                        <VerifiedBadge level={u.verification} long />
                        <Select
                          value={u.verification}
                          onValueChange={(v) => changeVerification(u, v as VerificationLevel)}
                          disabled={verifyingId === u.id}
                        >
                          <SelectTrigger
                            className="h-8 w-[150px] bg-background text-[12.5px]"
                            aria-label={t('admin.users.verificationLabel', { name: u.display_name })}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VERIFICATION_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {t(`verification.${level}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className={tdClass}>
                      {s ? <RatingStars value={s.rating_avg} count={s.rating_count} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className={cn(tdClass, 'text-right tabular-nums')}>{s ? s.sales_count : '—'}</TableCell>
                    <TableCell className={tdClass}>
                      <div className="space-y-0.5">
                        <Pill tone={banned ? 'down' : 'up'}>{t(banned ? 'admin.users.banned' : 'admin.users.active')}</Pill>
                        {banned && u.ban_reason && (
                          <p className="max-w-[220px] truncate text-[11.5px] text-muted-foreground" title={u.ban_reason}>
                            {t('banned.reason', { reason: u.ban_reason })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn(tdClass, 'text-right')}>
                      {banned ? (
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => openBan(u, false)}>
                          <UserCheck className="h-4 w-4" aria-hidden="true" />
                          {t('admin.users.unban')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-destructive/40 text-down hover:bg-destructive/10 hover:text-down"
                          onClick={() => openBan(u, true)}
                        >
                          <Ban className="h-4 w-4" aria-hidden="true" />
                          {t('admin.users.ban')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!banTarget}
        onOpenChange={(open) => !open && setBanTarget(null)}
        title={t(banTarget?.banned ? 'admin.users.banTitle' : 'admin.users.unbanTitle', { name: banTarget?.user.display_name ?? '' })}
        description={t(banTarget?.banned ? 'admin.users.banDescription' : 'admin.users.unbanDescription')}
        confirmLabel={t(banTarget?.banned ? 'admin.users.ban' : 'admin.users.unban')}
        destructive={!!banTarget?.banned}
        loading={setBan.isPending}
        onConfirm={confirmBan}
      >
        {banTarget?.banned && (
          <div className="space-y-1.5">
            <Label htmlFor="mt-ban-reason">
              {t('admin.users.banReason')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="mt-ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder={t('admin.users.banReasonPlaceholder')}
              rows={3}
              className="bg-background text-[13px]"
            />
            <p className="text-[12px] text-muted-foreground">{t('admin.users.banReasonHint')}</p>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
