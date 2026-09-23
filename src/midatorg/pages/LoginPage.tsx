import { useT } from '../lib/i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

/** Stub — the owning feature agent replaces this file (spec §7). */
export default function LoginPage() {
  const t = useT();
  useDocumentTitle();
  return (
    <PageContainer className="py-8">
      <EmptyState title={t('common.wip')} body={t('common.wipBody')} />
    </PageContainer>
  );
}
