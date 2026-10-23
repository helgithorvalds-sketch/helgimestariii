import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, type PanInfo } from 'framer-motion';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoinMark } from '../../components/brand';
import { Button, Chip, CreditTag, ProductImage } from '../../components/kit';
import { useAuth } from '../../lib/auth';
import { formatISK, formatSignedISK, formatTime } from '../../lib/format';
import { haptic } from '../../lib/haptics';
import { spring, springSnappy } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import { useProfile, useUpdateProfile } from '../../lib/queries';
import { CardVisual } from '../components/CardVisual';
import { WalletButton } from '../components/WalletButtons';
import { InitialsMark } from '../components/MerchantMark';
import { ToggleRow } from '../components/ToggleRow';
import { markOnboarded } from '../lib/storage';
import { usePageTitle } from '../lib/hooks';

const SLIDES = [
  { key: 'pay', title: 'Borgaðu fullt verð', body: 'Engir afsláttarkóðar, engin skilyrði við kassann. Þú borgar eins og venjulega.' },
  { key: 'credit', title: 'Inneignin kemur um leið', body: 'Hluti af verðinu kemur strax inn á inneignina þína hjá sömu keðju.' },
  { key: 'card', title: 'Kortið í símanum', body: 'Sýndu kortið við kassann til að safna og nýta. Það fer líka í veskið í símanum.' },
  { key: 'notify', title: 'Tilkynningar', body: 'Við látum þig vita þegar inneign kemur inn og þegar hún er að renna út.' },
] as const;

function PaySlide() {
  return (
    <div className="w-[200px]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
        <ProductImage src="/vild/img/products/margherita.jpg" name="Margherita" className="h-full w-full" eager />
        <div className="absolute bottom-2 left-2">
          <CreditTag>{formatSignedISK(1495)}</CreditTag>
        </div>
      </div>
      <p className="mt-2 text-[15px] font-semibold">Margherita</p>
      <p className="vild-num text-[13px] font-medium text-muted-foreground">{formatISK(2990)}</p>
    </div>
  );
}

function CreditSlide() {
  const now = new Date();
  return (
    <div className="w-full max-w-[340px] space-y-3">
      <div className="rounded-2xl border border-border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <InitialsMark text="LL" size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">
              Lúna Laugavegi <span className="vild-num font-medium text-muted-foreground">· {formatTime(now)}</span>
            </p>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">Margherita</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Chip tone="mint" className="vild-num h-7 text-[13px] font-bold">
              {formatSignedISK(1495)}
            </Chip>
            <span className="vild-num text-[12px] text-muted-foreground">{formatISK(2990)}</span>
          </div>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.3 }} className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--mint-300))] px-4 py-3 text-[hsl(var(--green-700))]">
        <CoinMark size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Inneignin bíður</p>
          <p className="vild-num text-[13px]">{formatISK(1495)} hjá Lúnu. Kíkirðu aftur?</p>
        </div>
      </motion.div>
    </div>
  );
}

function CardSlide({ name }: { name: string }) {
  return (
    <div className="w-full max-w-[340px]">
      <motion.div initial={{ rotate: -4, y: 12, opacity: 0 }} animate={{ rotate: -2, y: 0, opacity: 1 }} transition={spring}>
        <CardVisual holderName={name} balance={1495} pocketLabel="Hádegið · Lúna" compact />
      </motion.div>
      <div className="mt-6">
        <WalletButton kind="apple" />
      </div>
    </div>
  );
}

function NotifySlide({ checked, onChange, busy }: { checked: boolean; onChange: (v: boolean) => void; busy: boolean }) {
  return (
    <div className="w-full max-w-[340px]">
      <div className="rounded-2xl bg-white px-1 shadow-[var(--shadow-md)]">
        <ToggleRow label="Leyfa tilkynningar" caption="Inneign komin inn, inneign að renna út" checked={checked} onCheckedChange={onChange} disabled={busy} icon={<Bell className="h-5 w-5" aria-hidden="true" />} />
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-left">
        <CoinMark size={28} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">VILD · núna</p>
          <p className="text-[13px] text-muted-foreground">
            Þú fékkst <span className="vild-num font-semibold text-foreground">{formatSignedISK(1495)}</span> frá Lúnu. Inneignin bíður.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  usePageTitle('Byrja');
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next;
  const { isConsumer, profile } = useAuth();
  const profileQuery = useProfile();
  const update = useUpdateProfile();
  const [index, setIndex] = useState(0);
  const [notify, setNotify] = useState(true);
  const [width, setWidth] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const name = profileQuery.data?.name ?? profile?.name ?? 'Þitt nafn';

  useEffect(() => {
    if (profileQuery.data) setNotify(profileQuery.data.notificationsEnabled);
  }, [profileQuery.data]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    if (clamped !== index) void haptic('light');
    setIndex(clamped);
  };

  const finish = () => {
    markOnboarded();
    navigate(next && next.startsWith(href(paths.app)) ? next : href(paths.appHome), { replace: true });
  };

  const onNotify = (v: boolean) => {
    setNotify(v);
    if (isConsumer) update.mutate({ notificationsEnabled: v });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = Math.max(60, width * 0.2);
    if (info.offset.x < -threshold || info.velocity.x < -500) go(index + 1);
    else if (info.offset.x > threshold || info.velocity.x > 500) go(index - 1);
    else setIndex((i) => i);
  };

  const last = index === SLIDES.length - 1;

  return (
    <div className="vild mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[hsl(var(--surface-2))] text-foreground">
      <div className="flex items-center justify-between px-4 pt-[max(12px,var(--safe-top))]">
        <div className="flex items-center gap-2">
          <CoinMark size={28} />
        </div>
        <Link to={href(paths.appHome)} onClick={markOnboarded} className="flex h-10 items-center rounded-full px-3 text-[14px] font-semibold text-[hsl(var(--green-500))]">
          Sleppa
        </Link>
      </div>

      <div ref={trackRef} className="relative flex-1 overflow-hidden">
        <motion.div
          className="flex h-full"
          drag="x"
          dragConstraints={{ left: -(SLIDES.length - 1) * width, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          animate={{ x: -index * width }}
          transition={spring}
          style={{ width: width ? width * SLIDES.length : '100%' }}
        >
          {SLIDES.map((s, i) => (
            <section key={s.key} aria-hidden={i !== index} className="flex h-full shrink-0 flex-col px-6" style={{ width: width || '100%' }}>
              <div className="flex min-h-[300px] flex-1 items-center justify-center py-6">
                {s.key === 'pay' && <PaySlide />}
                {s.key === 'credit' && <CreditSlide />}
                {s.key === 'card' && <CardSlide name={name} />}
                {s.key === 'notify' && <NotifySlide checked={notify} onChange={onNotify} busy={update.isPending} />}
              </div>
              <div className="pb-4 text-center">
                <p className="vild-eyebrow">
                  {i + 1} af {SLIDES.length}
                </p>
                <h1 className="mt-2 text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{s.title}</h1>
                <p className="mx-auto mt-2 max-w-[32ch] text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </section>
          ))}
        </motion.div>
      </div>

      <div className="px-6 pb-[max(16px,var(--safe-bottom))] pt-2">
        <div className="mb-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Skref">
          {SLIDES.map((s, i) => (
            <button key={s.key} type="button" role="tab" aria-selected={i === index} aria-label={`Skref ${i + 1}`} onClick={() => go(i)} className="flex h-6 items-center">
              <motion.span layout transition={springSnappy} className={cn('block h-2 rounded-full', i === index ? 'w-6 bg-[hsl(var(--green-500))]' : 'w-2 bg-border')} />
            </button>
          ))}
        </div>
        {last ? (
          <Button variant="primary" size="lg" full onClick={finish}>
            Byrja
          </Button>
        ) : (
          <Button variant="primary" size="lg" full onClick={() => go(index + 1)}>
            Áfram
          </Button>
        )}
      </div>
    </div>
  );
}
