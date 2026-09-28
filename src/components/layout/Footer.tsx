import { Link } from 'react-router-dom';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { LocaleToggle } from '../common/LocaleToggle';

const linkClass = 'text-muted-foreground underline-offset-2 hover:text-primary hover:underline';

/** Simple white footer: one muted sentence and three links; stacks on phones. */
export function Footer() {
  const t = useT();
  return (
    <footer className="mt-12 border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl">
          <span className="font-medium text-foreground">{t('footer.copyright')}</span> · {t('footer.tagline')}
        </p>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label={t('footer.about')}>
          <Link to={href('/um')} className={linkClass}>
            {t('footer.about')}
          </Link>
          <Link to={href('/um#reglur')} className={linkClass}>
            {t('footer.rules')}
          </Link>
          <Link to={href('/um#samband')} className={linkClass}>
            {t('footer.contact')}
          </Link>
          <LocaleToggle className="sm:hidden" />
        </nav>
      </div>
    </footer>
  );
}
