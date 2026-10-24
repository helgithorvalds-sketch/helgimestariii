import { Suspense } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard, House, MapPin, Receipt, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '../lib/haptics';
import { pageVariants, springSnappy } from '../lib/motion';
import { href, paths } from '../lib/paths';
import { useScrollToTop } from './lib/hooks';

type Tab = { key: string; label: string; to: string; icon: LucideIcon; match: (pathname: string) => boolean };

const APP = href(paths.appHome);

const TABS: Tab[] = [
  { key: 'home', label: 'Heim', to: APP, icon: House, match: () => true },
  { key: 'places', label: 'Staðir', to: href(paths.appPlaces), icon: MapPin, match: (p) => p.startsWith(href(paths.appPlaces)) },
  { key: 'card', label: 'Kort', to: href(paths.appCard), icon: CreditCard, match: (p) => p.startsWith(href(paths.appCard)) },
  { key: 'history', label: 'Yfirlit', to: href(paths.appHistory), icon: Receipt, match: (p) => p.startsWith(href(paths.appHistory)) },
  { key: 'me', label: 'Ég', to: href(paths.appProfile), icon: User, match: (p) => p.startsWith(href(paths.appProfile)) },
];

function activeTab(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '');
  return TABS.slice(1).find((t) => t.match(clean))?.key ?? 'home';
}

function TabBar({ pathname }: { pathname: string }) {
  const active = activeTab(pathname);
  return (
    <nav aria-label="Aðalvalmynd" className="sticky bottom-0 z-40 border-t border-border bg-white pb-[var(--safe-bottom)]">
      <ul className="flex h-16 items-stretch">
        {TABS.map((t) => {
          const isActive = t.key === active;
          const Icon = t.icon;
          return (
            <li key={t.key} className="flex-1">
              <NavLink
                to={t.to}
                end={t.key === 'home'}
                onClick={() => {
                  if (!isActive) void haptic('light');
                }}
                aria-current={isActive ? 'page' : undefined}
                className={cn('relative flex h-full flex-col items-center justify-center gap-1 select-none', isActive ? 'text-[hsl(var(--green-500))]' : 'text-muted-foreground')}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                <span className={cn('text-[11px] leading-none', isActive ? 'font-semibold' : 'font-medium')}>{t.label}</span>
                {isActive && <motion.span layoutId="tab-indicator" transition={springSnappy} className="absolute bottom-1.5 h-[3px] w-5 rounded-full bg-[hsl(var(--green-500))]" aria-hidden="true" />}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PageFallback() {
  return <div className="min-h-[60dvh]" aria-busy="true" />;
}

/**
 * The consumer app frame: a 480px column (full width on phones) with the
 * tab bar stuck to its bottom, and route content that fades/rises in.
 */
export default function AppShell() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  useScrollToTop();
  return (
    <div className="min-h-dvh bg-[hsl(var(--surface-2))]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white md:border-x md:border-border">
        <main className="flex flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit" className="flex flex-1 flex-col">
              <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <TabBar pathname={pathname} />
      </div>
    </div>
  );
}
