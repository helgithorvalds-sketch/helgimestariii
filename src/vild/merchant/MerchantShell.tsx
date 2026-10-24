/**
 * The portal frame: a 240px white sidebar on desktop (wordmark, chain, nav,
 * signed-in user), a top bar with a menu sheet on phones. Pages render in a
 * 1120px column on surface-2.
 */
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Coins, FileText, LayoutDashboard, LogOut, MapPin, Menu, Plug, Settings, UtensilsCrossed, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from '../components/brand';
import { Sheet } from '../components/kit';
import { useAuth } from '../lib/auth';
import { href, paths } from '../lib/paths';
import { pageVariants } from '../lib/motion';
import { useMerchant, ROLE_LABELS } from './lib/useMerchant';
import { ChainMark } from './components/ui';

const NAV = [
  { to: paths.merchantDashboard, label: 'Yfirlit', icon: LayoutDashboard, end: true },
  { to: paths.merchantCredit, label: 'Inneign', icon: Coins },
  { to: paths.merchantProducts, label: 'Vörur', icon: UtensilsCrossed },
  { to: paths.merchantCampaigns, label: 'Herferðir', icon: CalendarClock },
  { to: paths.merchantLocations, label: 'Staðir', icon: MapPin },
  { to: paths.merchantPos, label: 'Kassakerfi', icon: Plug },
  { to: paths.merchantSettlement, label: 'Uppgjör', icon: FileText },
  { to: paths.merchantTeam, label: 'Teymi', icon: Users },
  { to: paths.merchantSettings, label: 'Stillingar', icon: Settings },
] as const;

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Stjórnborð" className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, ...rest }) => (
        <NavLink
          key={to}
          to={href(to)}
          end={'end' in rest ? rest.end : false}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
              isActive ? 'bg-[hsl(var(--mint-50))] font-semibold text-[hsl(var(--green-500))]' : 'font-medium text-foreground/80 hover:bg-secondary hover:text-foreground',
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function ChainHeader() {
  const { merchant } = useMerchant();
  return (
    <div className="flex items-center gap-3">
      <ChainMark text={merchant?.logoText ?? '·'} color={merchant?.brandColor} size={36} />
      <div className="min-w-0">
        <p className="vild-eyebrow">Fyrirtæki</p>
        <p className="truncate text-[16px] font-bold leading-tight">{merchant?.name ?? '…'}</p>
      </div>
    </div>
  );
}

function UserFooter({ onDone }: { onDone?: () => void }) {
  const { user } = useMerchant();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const out = async () => {
    setBusy(true);
    try {
      await signOut();
      onDone?.();
      navigate(href(paths.merchantLogin), { replace: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-t border-border pt-4">
      <div className="min-w-0 px-1">
        <p className="truncate text-[14px] font-semibold leading-tight">{user?.name ?? '…'}</p>
        <p className="truncate text-[12px] text-muted-foreground">{user ? ROLE_LABELS[user.role] : ''}</p>
      </div>
      <button type="button" onClick={out} disabled={busy} className="mt-2 inline-flex h-9 w-full items-center gap-2 rounded-lg px-1 text-[13px] font-semibold text-[hsl(var(--green-500))] hover:bg-accent disabled:opacity-50">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Útskrá
      </button>
    </div>
  );
}

export default function MerchantShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[hsl(var(--surface-2))] text-foreground lg:flex">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border bg-white px-4 py-5 lg:flex" aria-label="Hliðarstika">
        <div className="px-3">
          <Wordmark size="sm" className="text-[hsl(var(--green-500))]" />
        </div>
        <div className="mt-6 px-1">
          <ChainHeader />
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <Nav />
        </div>
        <UserFooter />
      </aside>

      {/* phone / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
        <Wordmark size="sm" className="text-[hsl(var(--green-500))]" />
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Opna valmynd" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-secondary">
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Stjórnborð">
        <div className="pb-2">
          <div className="pb-4">
            <ChainHeader />
          </div>
          <Nav onNavigate={() => setMenuOpen(false)} />
          <div className="mt-4">
            <UserFooter onDone={() => setMenuOpen(false)} />
          </div>
        </div>
      </Sheet>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit">
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
