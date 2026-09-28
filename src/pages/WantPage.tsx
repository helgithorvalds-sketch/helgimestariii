import { Link, useSearchParams } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { href } from '../lib/paths';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { PageContainer } from '../components/layout/PageContainer';
import { RequestForm } from '../components/forms/RequestForm';

/** /oska — want form (spec §5). `?event=<id>` preselects the event. Auth is enforced by RequireAuth in routes.tsx. */
export default function WantPage() {
  const t = useT();
  useDocumentTitle(t('forms.want.title'));
  const [params] = useSearchParams();
  const preselect = params.get('event');

  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="mx-auto max-w-[640px]">
        <header className="mb-5">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">{t('forms.want.title')}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('forms.want.intro')}</p>
        </header>
        <RequestForm preselectEventId={preselect} />
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {t('forms.want.sellInsteadText')}{' '}
          <Link
            to={href(preselect ? `/selja?event=${encodeURIComponent(preselect)}` : '/selja')}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {t('nav.sell')}
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
