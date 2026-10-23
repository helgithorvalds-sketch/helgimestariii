import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';

/** Scroll to the top on navigation, or to the hash target when there is one. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
}

export default function SiteLayout() {
  useScrollOnNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
