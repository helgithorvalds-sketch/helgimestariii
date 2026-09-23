import { Link } from 'react-router-dom';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { LocaleToggle } from '../common/LocaleToggle';

const linkClass = 'text-muted-foreground underline-offset-2 hover:text-foreground hover:underline';

/** border-t, 48px top margin, 12px muted; stacks on phones. */
export function Footer() {
  const t = useT();
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-5 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl">
          <span className="text-foreground">{t('footer.copyright')}</span> · {t('footer.tagline')}
        </p>
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label={t('footer.about')}>
          <Link to={href('/um')} className={linkClass}>
            {t('footer.about')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={href('/um#reglur')} className={linkClass}>
            {t('footer.rules')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={href('/um#samband')} className={linkClass}>
            {t('footer.contact')}
          </Link>
          <LocaleToggle className="sm:hidden" />
        </nav>
      </div>
    </footer>
  );
}
