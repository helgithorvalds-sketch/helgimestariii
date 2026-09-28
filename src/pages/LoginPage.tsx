import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Ticket } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { PageContainer } from '../components/layout/PageContainer';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { AuthForm, type AuthMode } from '../components/account/AuthForm';
import { resolveNext } from '../components/account/logic';

const tabTriggerClass =
  'h-10 flex-1 rounded-none border-b-2 border-transparent bg-transparent px-3 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

/** /innskra — tabs Innskrá · Nýskrá, magic link and forgot password; honours `?next=`. */
export default function LoginPage() {
  const t = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = resolveNext(params.get('next'));
  const [mode, setMode] = useState<AuthMode>(() => (params.get('flipi') === 'nyskra' ? 'signup' : 'login'));
  useDocumentTitle(t(mode === 'login' ? 'account.login.title' : 'account.login.signupTitle'));

  // already signed in (or just signed in): go where the user was heading
  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, user, next, navigate]);

  if (loading || user) {
    return (
      <PageContainer className="py-8">
        <PageSkeleton />
      </PageContainer>
    );
  }

  const trust = [t('account.login.trust1'), t('account.login.trust2'), t('account.login.trust3')];

  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[400px]">
        <h1 className="mb-5 flex items-center justify-center gap-2 text-[19px] font-bold tracking-tight text-primary">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
            <Ticket className="h-4 w-4" />
          </span>
          {t('common.appName')}
          <span className="sr-only"> · {t(mode === 'login' ? 'account.login.title' : 'account.login.signupTitle')}</span>
        </h1>

        <Tabs value={mode} onValueChange={(v) => setMode(v as AuthMode)}>
          <div className="mt-panel p-5">
            <TabsList className="mb-5 flex h-auto w-full rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="login" className={tabTriggerClass}>
                {t('account.login.tabLogin')}
              </TabsTrigger>
              <TabsTrigger value="signup" className={tabTriggerClass}>
                {t('account.login.tabSignup')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-0">
              <AuthForm mode="login" next={next} onSwitchMode={setMode} />
            </TabsContent>
            <TabsContent value="signup" className="mt-0">
              <AuthForm mode="signup" next={next} onSwitchMode={setMode} />
            </TabsContent>
          </div>
        </Tabs>

        <ul className="mt-5 space-y-2 border-t border-border pt-4 text-[12.5px] text-muted-foreground">
          {trust.map((line) => (
            <li key={line} className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}
