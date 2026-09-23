import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, Store, Tag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';

/** Bottom bar ≤ md: Markaður · Selja · Viðskipti · Ég. 56px + safe area; tap targets ≥ 44px. */
export function MobileNav() {
  const t = useT();
  const items = [
    { to: href('/'), end: true, icon: Store, label: t('nav.market') },
    { to: href('/selja'), end: false, icon: Tag, label: t('nav.sellShort') },
    { to: href('/vidskipti'), end: false, icon: ArrowLeftRight, label: t('nav.deals') },
    { to: href('/eg'), end: false, icon: User, label: t('nav.me') },
  ];
  return (
    <nav
      className="mt-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label={t('nav.market')}
    >
      <ul className="grid h-14 grid-cols-4">
        {items.map(({ to, end, icon: Icon, label }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5', isActive && 'text-primary')} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
