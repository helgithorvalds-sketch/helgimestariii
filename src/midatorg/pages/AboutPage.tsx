import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Ban,
  ExternalLink,
  Flag,
  HandCoins,
  Mail,
  ShieldCheck,
  Star,
  Tag,
  UserCheck,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '../lib/i18n';
import { href } from '../lib/paths';
import { useSettings } from '../lib/queries';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { PageContainer } from '../components/layout/PageContainer';
import { settingNumber } from '../components/admin/adminUtils';

/**
 * The monitored contact mailbox. `null` until the owner provides one: the contact
 * section then shows a clearly marked placeholder instead of a dead mailto
 * (spec §5: "Hafa samband (placeholder mailto)").
 */
export const CONTACT_EMAIL: string | null = null;
const TIX_URL = 'https://tix.is';
const DEFAULT_RESERVATION_MINUTES = 30;

const SECTIONS = ['hvernig', 'reglur', 'oryggi', 'tix', 'samband'] as const;
type SectionId = (typeof SECTIONS)[number];
const SECTION_TITLE_KEY: Record<SectionId, string> = {
  hvernig: 'about.how.title',
  reglur: 'about.rules.title',
  oryggi: 'about.safety.title',
  tix: 'about.tix.title',
  samband: 'about.contact.title',
};

function Section({ id, title, children }: { id: SectionId; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-panel scroll-mt-20 p-5">
      <h2 id={`${id}-title`} className="text-[18px] font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Rule({ icon: Icon, title, body }: { icon: ComponentType<LucideProps>; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-[13.5px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

/** /um — how it works, rules, safety tips, tix.is note, contact. Footer links to #reglur and #samband. */
export default function AboutPage() {
  const t = useT();
  useDocumentTitle(t('about.title'));
  const { hash } = useLocation();
  const settings = useSettings();
  const minutes =
    settingNumber(settings.data?.find((s) => s.key === 'reservation_minutes')?.value) ?? DEFAULT_RESERVATION_MINUTES;

  // Scroll to #reglur / #samband etc. once the page is mounted (react-router does not do it for us).
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) return;
    const el = document.getElementById(id);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start' });
  }, [hash]);

  const steps = [1, 2, 3].map((n) => ({
    n,
    title: t(`about.how.step${n}.title`),
    body: t(`about.how.step${n}.body`, { minutes }),
  }));

  return (
    <PageContainer className="max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]">{t('about.title')}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">{t('about.intro')}</p>
        <p className="mt-2 text-[12.5px] text-muted-foreground">{t('common.tagline')}</p>
        <nav aria-label={t('about.nav')} className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
          {SECTIONS.map((id) => (
            <a key={id} href={`#${id}`} className="py-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              {t(SECTION_TITLE_KEY[id])}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-4">
        <Section id="hvernig" title={t('about.how.title')}>
          <ol className="divide-y divide-border">
            {steps.map(({ n, title, body }) => (
              <li key={n} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold tabular-nums text-primary-foreground" aria-hidden="true">
                  {n}
                </span>
                <div>
                  <h3 className="text-[13.5px] font-semibold">{title}</h3>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" className="h-10 sm:h-9">
              <Link to={href('/selja')}>{t('nav.sell')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-10 sm:h-9">
              <Link to={href('/')}>{t('common.goHome')}</Link>
            </Button>
          </div>
        </Section>

        <Section id="reglur" title={t('about.rules.title')}>
          <ul className="space-y-4">
            <Rule icon={Tag} title={t('about.rules.cap.title')} body={t('about.rules.cap.body')} />
            <Rule icon={HandCoins} title={t('about.rules.escrow.title')} body={t('about.rules.escrow.body')} />
            <Rule icon={UserCheck} title={t('about.rules.verification.title')} body={t('about.rules.verification.body')} />
            <Rule icon={Star} title={t('about.rules.ratings.title')} body={t('about.rules.ratings.body')} />
            <Rule icon={Ban} title={t('about.rules.bans.title')} body={t('about.rules.bans.body')} />
          </ul>
        </Section>

        <Section id="oryggi" title={t('about.safety.title')}>
          <ul className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} className="flex gap-2.5 text-[13px]">
                {n === 5 ? (
                  <Flag className="mt-0.5 h-4 w-4 shrink-0 text-down" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
                )}
                <span>{t(`about.safety.tip${n}`)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="tix" title={t('about.tix.title')}>
          <p className="text-[13px] text-muted-foreground">{t('about.tix.body')}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 h-10 gap-1.5 sm:h-9">
            <a href={TIX_URL} target="_blank" rel="noreferrer noopener">
              {t('about.tix.link')}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </Section>

        <Section id="samband" title={t('about.contact.title')}>
          <p className="text-[13px] text-muted-foreground">{t('about.contact.body')}</p>
          {CONTACT_EMAIL ? (
            <>
              <Button asChild size="sm" className="mt-3 h-10 gap-1.5 sm:h-9">
                <a href={`mailto:${CONTACT_EMAIL}`}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {t('about.contact.email')}
                </a>
              </Button>
              <p className="mt-2 text-[12.5px] text-muted-foreground">{CONTACT_EMAIL}</p>
            </>
          ) : (
            <p className="mt-3 text-[13px] font-medium" data-testid="contact-pending">
              {t('about.contact.pending')}
            </p>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
