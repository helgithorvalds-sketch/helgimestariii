import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from '../../components/brand';
import { href, paths } from '../../lib/paths';
import { DUR, EASE_IN_OUT, EASE_OUT } from '../../lib/motion';
import { LinkButton } from './LinkButton';

export const HOW_IT_WORKS_HASH = '#svona-virkar';

const NAV = [
  { label: 'Svona virkar VILD', to: `${href(paths.site)}${HOW_IT_WORKS_HASH}`, hash: true },
  { label: 'Fyrir veitingastaði', to: href(paths.siteForRestaurants) },
  { label: 'Spurningar', to: href(paths.siteFaq) },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const onHome = location.pathname === href(paths.site) || location.pathname === '/' || location.pathname === `${href(paths.site)}/`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on navigation and lock the page behind it.
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const navLink = (item: (typeof NAV)[number], className: string) =>
    item.hash && onHome ? (
      <a key={item.label} href={HOW_IT_WORKS_HASH} className={className} onClick={() => setOpen(false)}>
        {item.label}
      </a>
    ) : (
      <Link key={item.label} to={item.to} className={className} onClick={() => setOpen(false)}>
        {item.label}
      </Link>
    );

  return (
    <header className={cn('sticky top-0 z-40 bg-white transition-shadow duration-200', scrolled ? 'border-b border-border' : 'border-b border-transparent')}>
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link to={href(paths.site)} className="flex h-11 items-center text-[hsl(var(--green-500))]" aria-label="VILD, forsíða">
          <Wordmark size="md" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Aðalvalmynd">
          {NAV.map((item) => navLink(item, 'text-[15px] font-medium text-foreground/80 transition-colors hover:text-[hsl(var(--green-500))]'))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LinkButton to={href(paths.merchantLogin)} variant="ghost" size="sm" className="hidden lg:inline-flex">
            Innskráning fyrirtækja
          </LinkButton>
          <LinkButton to={href(paths.app)} size="sm">
            Sækja appið
          </LinkButton>
        </div>

        <button
          type="button"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground md:hidden"
          aria-label={open ? 'Loka valmynd' : 'Opna valmynd'}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" /> : <Menu className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            className="fixed inset-0 top-16 z-30 flex flex-col bg-white md:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_IN_OUT } }}
          >
            <nav className="flex flex-1 flex-col px-4 pt-6 sm:px-6" aria-label="Valmynd">
              {NAV.map((item) => navLink(item, 'border-b border-border py-5 text-[28px] font-extrabold tracking-[-0.03em] text-foreground'))}
              <Link to={href(paths.merchantLogin)} className="border-b border-border py-5 text-[28px] font-extrabold tracking-[-0.03em] text-foreground" onClick={() => setOpen(false)}>
                Innskráning fyrirtækja
              </Link>
            </nav>
            <div className="px-4 pb-[max(24px,var(--safe-bottom))] sm:px-6">
              <LinkButton to={href(paths.app)} size="lg" full onClick={() => setOpen(false)}>
                Sækja appið
              </LinkButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
