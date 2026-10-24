import { useEffect, useRef, useState } from 'react';
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
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const location = useLocation();
  const onHome = location.pathname === href(paths.site) || location.pathname === '/' || location.pathname === `${href(paths.site)}/`;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      setCompact(y > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on navigation.
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  // The open menu is modal: the page behind it (main, footer) is inert and does
  // not scroll, focus starts on the first link and goes back to the toggle on close.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        toggleRef.current?.focus();
      }
      return;
    }
    wasOpen.current = true;
    const header = headerRef.current;
    const behind = header?.parentElement ? Array.from(header.parentElement.children).filter((el) => el !== header) : [];
    behind.forEach((el) => el.setAttribute('inert', ''));
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    menuRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    // The menu only exists below md; if the window grows past it, close rather than leave the page inert.
    const wide = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)') : null;
    const onWide = () => wide?.matches && setOpen(false);
    wide?.addEventListener?.('change', onWide);
    return () => {
      behind.forEach((el) => el.removeAttribute('inert'));
      html.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      wide?.removeEventListener?.('change', onWide);
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

  // The bar is 72px at rest and settles to 60px once the page has moved 40px.
  // Height is the one property animated here: a single sticky element, no list.
  // Opening the menu does not change it, so the page behind never shifts.
  const height = compact ? 60 : 72;

  return (
    <header
      ref={headerRef}
      className={cn('sticky top-0 z-40 bg-white transition-[border-color] duration-200', scrolled ? 'border-b border-border' : 'border-b border-transparent')}
      style={{ ['--site-header-h' as string]: `${height}px` }}
    >
      <div className="mx-auto flex h-[var(--site-header-h)] w-full max-w-[1120px] items-center justify-between gap-6 px-4 transition-[height] duration-200 ease-out sm:px-6 lg:px-8">
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
          ref={toggleRef}
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
            ref={menuRef}
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Valmynd"
            className="fixed inset-0 top-[var(--site-header-h)] z-30 flex flex-col bg-white md:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_IN_OUT } }}
          >
            <nav className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-6 sm:px-6" aria-label="Valmynd">
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
