import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Flag, Scale, SlidersHorizontal, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { ErrorState } from '../components/common/ErrorState';
import { PageContainer } from '../components/layout/PageContainer';
import { DisputesTable, EventsTable, ImportPanel, ReportsTable, SettingsPanel, UsersTable } from '../components/admin';

/** URL tab values (`?flipi=`), Icelandic like the other query params. */
const TABS = [
  { value: 'tilkynningar', key: 'reports', icon: Flag },
  { value: 'notendur', key: 'users', icon: Users },
  { value: 'vidburdir', key: 'events', icon: CalendarDays },
  { value: 'agreiningur', key: 'disputes', icon: Scale },
  { value: 'stillingar', key: 'settings', icon: SlidersHorizontal },
] as const;
type TabValue = (typeof TABS)[number]['value'];
const TAB_PARAM = 'flipi';

function isTab(v: string | null): v is TabValue {
  return TABS.some((tab) => tab.value === v);
}

/** /stjorn — admin console. RequireAdmin guards the route; we still check isAdmin here. */
export default function AdminPage() {
  const t = useT();
  const { isAdmin } = useAuth();
  useDocumentTitle(t('admin.title'));
  const [params, setParams] = useSearchParams();
  const raw = params.get(TAB_PARAM);
  const tab: TabValue = isTab(raw) ? raw : 'tilkynningar';

  const setTab = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'tilkynningar') next.delete(TAB_PARAM);
    else next.set(TAB_PARAM, value);
    setParams(next, { replace: true });
  };

  if (!isAdmin) {
    return (
      <PageContainer className="py-8">
        <ErrorState title={t('common.noAccessTitle')} body={t('common.noAccessBody')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-6">
      <header className="mb-4">
        <h1 className="text-[18px] font-bold tracking-tight">{t('admin.title')}</h1>
        <p className="text-[13px] text-muted-foreground">{t('admin.subtitle')}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          aria-label={t('admin.tabsLabel')}
          className="mt-scroll-x flex h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
        >
          {TABS.map(({ value, key, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-10 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(`admin.tab.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tilkynningar" className="mt-4">
          <ReportsTable />
        </TabsContent>
        <TabsContent value="notendur" className="mt-4">
          <UsersTable />
        </TabsContent>
        <TabsContent value="vidburdir" className="mt-4 space-y-4">
          <ImportPanel />
          <EventsTable />
        </TabsContent>
        <TabsContent value="agreiningur" className="mt-4">
          <DisputesTable />
        </TabsContent>
        <TabsContent value="stillingar" className="mt-4">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
