import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from '../../components/brand';
import { Button } from '../../components/kit';
import { api, errorMessage, IS_MOCK } from '../../data';
import { useAuth } from '../../lib/auth';
import { href, paths } from '../../lib/paths';
import { Field, TextInput } from '../components/ui';

export default function LoginPage() {
  const { isMerchant, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Innskráning fyrirtækja · VILD';
  }, []);

  if (!loading && isMerchant) return <Navigate to={next ?? href(paths.merchantDashboard)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api().merchantLogin(email, password);
      navigate(next ?? href(paths.merchantDashboard), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--surface-2))] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-white px-6 py-8 sm:px-8" noValidate>
          <Wordmark size="md" className="text-[hsl(var(--green-500))]" />
          <h1 className="mt-6 text-[24px] font-extrabold leading-tight tracking-[-0.025em]">Innskráning fyrirtækja</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Stjórnborð fyrir keðjur sem gefa inneign með VILD.</p>

          <div className="mt-6 space-y-4">
            <Field label="Netfang" htmlFor="m-email">
              <TextInput id="m-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nafn@fyrirtaeki.is" required />
            </Field>
            <Field label="Lykilorð" htmlFor="m-password">
              <TextInput id="m-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[14px] font-semibold text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" full size="lg" loading={busy} className="mt-6" disabled={!email || !password}>
            Skrá inn
          </Button>

          {IS_MOCK && (
            <p className="mt-4 rounded-xl bg-[hsl(var(--mint-50))] px-3.5 py-2.5 text-[13px] text-[hsl(var(--green-700))]">
              Prufuaðgangur: <span className="font-semibold">johanna@luna.is</span> / hvaða lykilorð sem er
            </p>
          )}
        </form>
        <p className="mt-5 text-center text-[14px] text-muted-foreground">
          Ertu ekki með aðgang?{' '}
          <a href={href(paths.siteForRestaurants)} className="font-semibold text-[hsl(var(--green-500))]">
            Hafa samband
          </a>
        </p>
      </div>
    </div>
  );
}
