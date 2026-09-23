import { Link, useSearchParams } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { href } from '../lib/paths';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { PageContainer } from '../components/layout/PageContainer';
import { ListingForm } from '../components/forms/ListingForm';

/** /selja — sell form (spec §5). `?event=<id>` preselects the event. Auth is enforced by RequireAuth in routes.tsx. */
export default function SellPage() {
  const t = useT();
  useDocumentTitle(t('forms.sell.title'));
  const [params] = useSearchParams();
  const preselect = params.get('event');

  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="mx-auto max-w-[640px]">
        <header className="mb-5">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">{t('forms.sell.title')}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('forms.sell.intro')}</p>
        </header>
        <ListingForm preselectEventId={preselect} />
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {t('forms.sell.wantInsteadText')}{' '}
          <Link
            to={href(preselect ? `/oska?event=${encodeURIComponent(preselect)}` : '/oska')}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {t('nav.want')}
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
