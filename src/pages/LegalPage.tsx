import { Link } from 'react-router-dom';
import { useLocale, useT } from '../lib/i18n';
import { href } from '../lib/paths';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { formatDate } from '../lib/format';
import { PageContainer } from '../components/layout/PageContainer';
import { LEGAL_UPDATED, LEGAL_VERSION, privacyDoc, termsDoc } from '../content/legal';

/** /skilmalar and /personuvernd: one readable column, a table of contents, anchors per section. */
export default function LegalPage({ doc: kind }: { doc: 'terms' | 'privacy' }) {
  const t = useT();
  const [locale] = useLocale();
  const doc = kind === 'terms' ? termsDoc(locale) : privacyDoc(locale);
  useDocumentTitle(doc.title);

  return (
    <PageContainer className="py-6 sm:py-10">
      <article className="mx-auto max-w-[720px]">
        <header className="mb-6">
          <h1 className="text-[26px] font-bold tracking-tight sm:text-[30px]">{doc.title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t('legal.version', { version: LEGAL_VERSION, date: formatDate(`${LEGAL_UPDATED}T12:00:00Z`, locale) })}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed">{doc.intro}</p>
        </header>

        <nav aria-label={t('legal.contents')} className="mt-panel mb-8 p-4">
          <p className="mb-2 text-[13px] font-semibold">{t('legal.contents')}</p>
          <ol className="grid gap-1 text-[14px] sm:grid-cols-2">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary underline-offset-2 hover:underline">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-20">
              <h2 id={`${s.id}-h`} className="text-[18px] font-bold tracking-tight">
                {s.heading}
              </h2>
              <div className="mt-2 space-y-3 text-[15px] leading-relaxed">
                {s.blocks.map((b, i) =>
                  'p' in b ? (
                    <p key={i}>{b.p}</p>
                  ) : (
                    <ul key={i} className="list-disc space-y-1.5 pl-5">
                      {b.ul.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-border pt-4 text-[14px] text-muted-foreground">
          {kind === 'terms' ? (
            <Link to={href('/personuvernd')} className="text-primary underline-offset-2 hover:underline">
              {t('legal.privacyLink')}
            </Link>
          ) : (
            <Link to={href('/skilmalar')} className="text-primary underline-offset-2 hover:underline">
              {t('legal.termsLink')}
            </Link>
          )}
        </p>
      </article>
    </PageContainer>
  );
}
