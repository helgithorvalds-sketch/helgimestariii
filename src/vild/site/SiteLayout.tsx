import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { pageVariants, prefersReducedMotion } from '../lib/motion';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';

/**
 * One frame per route. It jumps to the top (or the hash target) when it
 * mounts, i.e. after the previous page has faded out, so the old page never
 * moves during its exit and no scroll glide overlaps the crossfade. A frame
 * that is exiting sees the next route's location and leaves the scroll alone;
 * a hash change within the page (a Link to `#…` on the same route) glides,
 * like the in-page anchors do. The first frame skips its own enter
 * (`enter=false`) instead of `AnimatePresence initial={false}`: that prop
 * would block the `initial` state of every descendant on the first page, so
 * nothing would rise in, draw or reveal on load.
 */
function PageFrame({ children, enter }: { children: ReactNode; enter: boolean }) {
  const { pathname, hash } = useLocation();
  const ownPath = useRef(pathname);
  const mounted = useRef(false);
  useEffect(() => {
    if (pathname !== ownPath.current) return;
    const onMount = !mounted.current;
    mounted.current = true;
    const behavior: ScrollBehavior = onMount || prefersReducedMotion() ? 'instant' : 'smooth';
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView({ block: 'start', behavior });
    else if (onMount) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return (
    <motion.div variants={pageVariants} initial={enter ? 'initial' : false} animate="enter" exit="exit" className="flex flex-1 flex-col">
      {children}
    </motion.div>
  );
}

export default function SiteLayout() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  // False for the first page only: it is already there when the site loads.
  const [booted, setBooted] = useState(false);
  useEffect(() => setBooted(true), []);
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-white text-foreground">
        <SiteHeader />
        <main className="flex flex-1 flex-col">
          <AnimatePresence mode="wait">
            <PageFrame key={pathname} enter={booted}>
              {outlet}
            </PageFrame>
          </AnimatePresence>
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  );
}
