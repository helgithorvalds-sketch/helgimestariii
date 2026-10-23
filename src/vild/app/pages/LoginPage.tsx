import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Fingerprint, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { Button, ErrorState } from '../../components/kit';
import { IS_MOCK, api, errorMessage } from '../../data';
import { useAuth } from '../../lib/auth';
import { EASE_OUT, spring, tapSmall } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import { isOnboarded } from '../lib/storage';
import { usePageTitle } from '../lib/hooks';

type Step = 'choose' | 'phone' | 'code';

const LETTERS = ['V', 'I', 'L', 'D'];

/** The wordmark drawn in letter by letter, once. */
function DrawnWordmark() {
  return (
    <span className="vild-wordmark inline-block pl-[0.42em] text-[56px] text-[hsl(var(--green-500))]" role="img" aria-label="VILD">
      {LETTERS.map((ch, i) => (
        <motion.span key={ch} aria-hidden="true" className="inline-block" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.09, duration: 0.5, ease: EASE_OUT }}>
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function LoginPage() {
  usePageTitle('Innskráning');
  const navigate = useNavigate();
  const location = useLocation();
  const { isConsumer, loading } = useAuth();
  const next = (location.state as { next?: string } | null)?.next;

  const [step, setStep] = useState<Step>('choose');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'none' | 'sms' | 'code' | 'eid'>('none');
  const [error, setError] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Once a consumer session exists (from either flow), leave this screen.
  useEffect(() => {
    if (loading || !isConsumer) return;
    const dest = !isOnboarded() ? href(paths.appOnboarding) : next && next.startsWith(href(paths.app)) ? next : href(paths.appHome);
    navigate(dest, { replace: true, state: { next } });
  }, [isConsumer, loading, navigate, next]);

  useEffect(() => {
    if (step === 'phone') phoneRef.current?.focus();
  }, [step]);

  const digits = phone.replace(/\D/g, '').slice(0, 7);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy('sms');
    try {
      await api().startPhoneLogin(digits);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('none');
    }
  };

  const verify = async (value: string) => {
    setError(null);
    setBusy('code');
    try {
      await api().verifyPhoneLogin(digits, value);
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      setBusy('none');
    }
  };

  const eid = async () => {
    setError(null);
    setBusy('eid');
    try {
      const res = await api().startEidLogin(next);
      if (res.url) window.location.assign(res.url);
      else if (!res.session) setBusy('none');
    } catch (err) {
      setError(errorMessage(err));
      setBusy('none');
    }
  };

  return (
    <div className="vild flex min-h-dvh flex-col bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))]">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-[max(24px,var(--safe-top))] text-center">
        <DrawnWordmark />
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5, ease: EASE_OUT }} className="mt-6 max-w-[26ch] text-[19px] font-semibold leading-snug tracking-[-0.01em]">
          Þú borgar fullt verð. Hluti kemur til baka sem inneign.
        </motion.p>
      </div>

      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: 0.35 }} className="mx-auto w-full max-w-[480px] px-3 pb-[max(12px,var(--safe-bottom))]">
        <div className="rounded-[22px] bg-white px-5 pb-5 pt-5 text-foreground shadow-[var(--shadow-lg)]">
          <AnimatePresence mode="wait" initial={false}>
            {step === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
                <p className="vild-eyebrow">Innskráning</p>
                <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.02em]">Skráðu þig inn</h1>
                <div className="mt-4 space-y-2.5">
                  <Button variant="primary" size="lg" full onClick={() => void eid()} loading={busy === 'eid'} disabled={busy !== 'none'}>
                    {busy === 'eid' ? (
                      'Opna Auðkenni…'
                    ) : (
                      <>
                        <Fingerprint className="h-5 w-5" aria-hidden="true" />
                        Rafræn skilríki
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" size="lg" full onClick={() => setStep('phone')} disabled={busy !== 'none'}>
                    Símanúmer
                  </Button>
                </div>
                {error && <ErrorState message={error} className="mt-3" />}
              </motion.div>
            )}

            {step === 'phone' && (
              <motion.form key="phone" onSubmit={(e) => void sendCode(e)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
                <div className="flex items-center gap-2">
                  <motion.button type="button" whileTap={tapSmall} aria-label="Til baka" onClick={() => setStep('choose')} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </motion.button>
                  <p className="vild-eyebrow">Símanúmer</p>
                </div>
                <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.02em]">Við sendum þér kóða</h1>
                <label htmlFor="vild-phone" className="sr-only">
                  Símanúmer
                </label>
                <div className={cn('mt-4 flex h-[52px] items-center rounded-[14px] border border-border bg-secondary pl-4 pr-2 focus-within:border-[hsl(var(--green-500))] focus-within:bg-white')}>
                  <span className="vild-num text-[17px] font-semibold text-muted-foreground">+354</span>
                  <input
                    id="vild-phone"
                    ref={phoneRef}
                    value={digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 7))}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9 ]*"
                    placeholder="666 1234"
                    className="vild-num ml-2 h-full min-w-0 flex-1 bg-transparent text-[17px] font-semibold tracking-[0.02em] outline-none placeholder:font-medium placeholder:text-muted-foreground/60"
                  />
                </div>
                {error && <ErrorState message={error} className="mt-3" />}
                <Button type="submit" variant="primary" size="lg" full className="mt-3" loading={busy === 'sms'} disabled={digits.length !== 7}>
                  Senda kóða
                </Button>
              </motion.form>
            )}

            {step === 'code' && (
              <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
                <div className="flex items-center gap-2">
                  <motion.button type="button" whileTap={tapSmall} aria-label="Til baka" onClick={() => setStep('phone')} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </motion.button>
                  <p className="vild-eyebrow">Staðfestingarkóði</p>
                </div>
                <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.02em]">Sláðu inn kóðann</h1>
                <p className="vild-num mt-1 text-[14px] text-muted-foreground">
                  Sendur á +354 {digits.slice(0, 3)} {digits.slice(3)}
                </p>
                <div className="mt-4 flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="Staðfestingarkóði"
                    disabled={busy === 'code'}
                    onChange={(v) => {
                      setCode(v);
                      if (v.length === 6) void verify(v);
                    }}
                    containerClassName="gap-1.5"
                  >
                    <InputOTPGroup className="gap-1.5">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="vild-num h-12 w-11 rounded-xl border border-border bg-secondary text-[20px] font-bold first:rounded-l-xl last:rounded-r-xl data-[active=true]:bg-white" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="mt-3 min-h-[20px] text-center text-[13px] text-muted-foreground" aria-live="polite">
                  {busy === 'code' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Staðfesti…
                    </span>
                  ) : IS_MOCK ? (
                    <span>
                      Prufukóði: <span className="vild-num font-semibold">123456</span>
                    </span>
                  ) : (
                    <button type="button" className="font-semibold text-[hsl(var(--green-500))]" onClick={() => void sendCode()}>
                      Senda kóða aftur
                    </button>
                  )}
                </div>
                {error && <ErrorState message={error} className="mt-2" />}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-4 text-center text-[12px] leading-relaxed text-muted-foreground">
            Með því að halda áfram samþykkir þú{' '}
            <Link to={href(paths.siteTerms)} className="font-semibold text-[hsl(var(--green-500))]">
              skilmála
            </Link>{' '}
            og{' '}
            <Link to={href(paths.sitePrivacy)} className="font-semibold text-[hsl(var(--green-500))]">
              persónuverndarstefnu
            </Link>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}
