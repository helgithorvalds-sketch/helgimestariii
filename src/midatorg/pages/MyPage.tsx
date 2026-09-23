import { Link, useSearchParams } from 'react-router-dom';
import { Bell, ExternalLink, Search, Star, Tag, User, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { href } from '../lib/paths';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { PageContainer } from '../components/layout/PageContainer';
import { ErrorState } from '../components/common/ErrorState';
import { UserAvatar } from '../components/common/UserAvatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { secondaryButtonClass } from '../components/common/buttonClasses';
import { ProfileForm } from '../components/account/ProfileForm';
import { VerificationCard } from '../components/account/VerificationCard';
import { MyListingsList } from '../components/account/MyListingsList';
import { MyRequestsList } from '../components/account/MyRequestsList';
import { MyAlertsList } from '../components/account/MyAlertsList';
import { RatingsList } from '../components/account/RatingsList';
import { SetPasswordCard } from '../components/account/SetPasswordCard';
import { parseMyTab, type MyTab } from '../components/account/logic';

const tabTriggerClass =
  'h-11 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none [&_svg]:h-4 [&_svg]:w-4';

/** /eg — Yfirlit · Mínar sölur · Óskir · Vaktanir · Einkunnir (`?flipi=`); `?reset=1` shows the new-password card. */
export default function MyPage() {
  const t = useT();
  const { user, profile, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = parseMyTab(params.get('flipi'));
  const showReset = params.get('reset') === '1';
  useDocumentTitle(t('account.my.title'));

  const setTab = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('flipi', value);
        return next;
      },
      { replace: true },
    );

  const finishReset = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('reset');
        return next;
      },
      { replace: true },
    );

  // RequireAuth guarantees a user; keep the type narrow for the JSX below
  if (!user) return null;

  const tabs: { value: MyTab; label: string; icon: ComponentType<LucideProps> }[] = [
    { value: 'yfirlit', label: t('account.my.tabs.overview'), icon: User },
    { value: 'solur', label: t('account.my.tabs.listings'), icon: Tag },
    { value: 'oskir', label: t('account.my.tabs.requests'), icon: Search },
    { value: 'vaktanir', label: t('account.my.tabs.alerts'), icon: Bell },
    { value: 'einkunnir', label: t('account.my.tabs.ratings'), icon: Star },
  ];

  const avatarProfile = profile ?? { id: user.id, display_name: user.email?.split('@')[0] ?? '' };

  return (
    <PageContainer className="py-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <UserAvatar profile={avatarProfile} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-bold tracking-tight">{t('account.my.title')}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span className="truncate">{profile?.display_name ?? user.email}</span>
            {profile && <VerifiedBadge level={profile.verification} />}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className={cn('h-10 text-[13px] sm:h-9', secondaryButtonClass)}>
          <Link to={href(`/notendur/${user.id}`)}>
            <ExternalLink aria-hidden="true" />
            {t('account.my.viewPublic')}
          </Link>
        </Button>
      </header>

      {showReset && <SetPasswordCard onDone={finishReset} className="mb-5" />}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mt-scroll-x mb-4 flex h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className={tabTriggerClass}>
              <Icon aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="yfirlit" className="mt-0 space-y-4">
          {profile ? (
            <>
              <ProfileForm profile={profile} />
              <VerificationCard />
            </>
          ) : (
            <ErrorState body={t('account.my.profileMissing')} retry={() => void refreshProfile()} />
          )}
        </TabsContent>
        <TabsContent value="solur" className="mt-0">
          <MyListingsList />
        </TabsContent>
        <TabsContent value="oskir" className="mt-0">
          <MyRequestsList />
        </TabsContent>
        <TabsContent value="vaktanir" className="mt-0">
          <MyAlertsList />
        </TabsContent>
        <TabsContent value="einkunnir" className="mt-0">
          <RatingsList userId={user.id} own />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
