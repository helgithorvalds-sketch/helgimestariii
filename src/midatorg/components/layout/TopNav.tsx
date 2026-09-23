import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, LogOut, Search, Shield, Ticket, User, ArrowLeftRight, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth, loginHref } from '../../lib/auth';
import { href, MIDATORG_BASE } from '../../lib/paths';
import { UserAvatar } from '../common/UserAvatar';
import { LocaleToggle } from '../common/LocaleToggle';
import { NotificationsMenu } from './NotificationsMenu';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex h-9 items-center rounded-md px-2.5 text-[13px] font-medium transition-colors hover:bg-surface-2 hover:text-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  );

function SearchForm({ className }: { className?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const isHome = location.pathname === MIDATORG_BASE || location.pathname === MIDATORG_BASE + '/';
  const [value, setValue] = useState(() => (isHome ? (params.get('q') ?? '') : ''));
  const inputRef = useRef<HTMLInputElement>(null);

  // keep the field in sync with the URL on the home page
  useEffect(() => {
    if (isHome) setValue(params.get('q') ?? '');
  }, [isHome, params]);

  // "/" focuses the search unless the user is typing somewhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const next = new URLSearchParams(isHome ? params : undefined);
    if (q) next.set('q', q);
    else next.delete('q');
    const qs = next.toString();
    navigate(href(qs ? `/?${qs}` : '/'));
  };

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor="mt-search" className="sr-only">
        {t('nav.searchLabel')}
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        id="mt-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('nav.searchPlaceholder')}
        autoComplete="off"
        className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-11 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <kbd
        className="mt-mono pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border border-border bg-background px-1.5 text-[11px] text-muted-foreground sm:inline-flex"
        aria-hidden="true"
        title={t('nav.searchHint')}
      >
        /
      </kbd>
    </form>
  );
}

function UserMenu() {
  const t = useT();
  const navigate = useNavigate();
  const { profile, user, isAdmin, signOut } = useAuth();
  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? '';
  const avatarProfile = profile ? { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url } : user ? { id: user.id, display_name: name } : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-1.5 pr-2 text-[13px] font-medium"
          aria-label={t('nav.userMenu')}
        >
          <UserAvatar profile={avatarProfile} size={26} />
          <span className="hidden max-w-[120px] truncate md:inline">{name}</span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-[12px] font-medium text-muted-foreground">{user?.email ?? name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(href('/eg'))} className="cursor-pointer gap-2">
          <User className="h-4 w-4" aria-hidden="true" /> {t('nav.myPage')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(href('/vidskipti'))} className="cursor-pointer gap-2">
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> {t('nav.deals')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(href('/tilkynningar'))} className="cursor-pointer gap-2">
          <Bell className="h-4 w-4" aria-hidden="true" /> {t('nav.notifications')}
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onSelect={() => navigate(href('/stjorn'))} className="cursor-pointer gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" /> {t('nav.admin')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut().then(() => navigate(href('/')));
          }}
          className="cursor-pointer gap-2"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Sticky 56px header: wordmark · search · nav · "Selja miða" · bell · avatar/Innskrá · locale. Wraps on phones. */
export function TopNav() {
  const t = useT();
  const { user, loading } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0 sm:px-6">
        <Link to={href('/')} className="flex shrink-0 items-center gap-2 rounded-md" aria-label={t('nav.home')}>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden="true">
            <Ticket className="h-4 w-4" />
          </span>
          <span className="text-[17px] font-bold tracking-tight">{t('common.appName')}</span>
        </Link>

        <SearchForm className="order-last w-full basis-full sm:order-none sm:mx-2 sm:w-auto sm:max-w-[520px] sm:flex-1 sm:basis-auto" />

        <nav className="ml-auto flex items-center gap-1" aria-label={t('nav.market')}>
          <NavLink to={href('/')} end className={cn(navLinkClass, 'hidden lg:inline-flex')}>
            {t('nav.market')}
          </NavLink>
          {user && (
            <NavLink to={href('/vidskipti')} className={cn(navLinkClass, 'hidden lg:inline-flex')}>
              {t('nav.deals')}
            </NavLink>
          )}
          <NavLink to={href('/um')} className={cn(navLinkClass, 'hidden xl:inline-flex')}>
            {t('nav.about')}
          </NavLink>
          <Button asChild size="sm" className="ml-1 h-9 px-3 text-[13px] font-semibold">
            <Link to={href('/selja')}>{t('nav.sell')}</Link>
          </Button>
          {user && <NotificationsMenu className="ml-1" />}
          {loading ? (
            <span className="ml-1 h-9 w-9 animate-pulse rounded-full bg-surface-2" aria-hidden="true" />
          ) : user ? (
            <UserMenu />
          ) : (
            <Button asChild variant="ghost" size="sm" className="h-9 px-3 text-[13px] font-medium">
              <Link to={loginHref(location.pathname + location.search)}>{t('nav.login')}</Link>
            </Button>
          )}
          <LocaleToggle className="hidden sm:inline-flex" />
        </nav>
      </div>
    </header>
  );
}
