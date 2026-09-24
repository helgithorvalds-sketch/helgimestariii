import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, CalendarDays, Tag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';

/** White bottom bar ≤ md: Viðburðir · Selja · Viðskipti · Ég. 56px + safe area; tap targets ≥ 44px. */
export function MobileNav() {
  const t = useT();
  const items = [
    { to: href('/'), end: true, icon: CalendarDays, label: t('nav.market') },
    { to: href('/selja'), end: false, icon: Tag, label: t('nav.sellShort') },
    { to: href('/vidskipti'), end: false, icon: ArrowLeftRight, label: t('nav.deals') },
    { to: href('/eg'), end: false, icon: User, label: t('nav.me') },
  ];
  return (
    <nav className="mt-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden" aria-label={t('nav.bottomLabel')}>
      <ul className="grid h-14 grid-cols-4">
        {items.map(({ to, end, icon: Icon, label }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[12px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
