import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '../lib/i18n';
import { href } from '../lib/paths';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

export default function NotFoundPage() {
  const t = useT();
  useDocumentTitle(t('title.notFound'));
  return (
    <PageContainer className="py-12">
      <EmptyState
        icon={SearchX}
        title={t('common.notFoundTitle')}
        body={t('common.notFoundBody')}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to={href('/')}>{t('common.goHome')}</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
