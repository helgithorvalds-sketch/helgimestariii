import type { ReactNode } from 'react';
import { Container, Display, Eyebrow } from './layout';

export type LegalSection = { id: string; title: string; body: ReactNode[] };

/** Terms and privacy share one quiet layout: a title column and a 68ch text column with anchored sections. */
export function LegalPage({ eyebrow, title, updated, intro, sections }: { eyebrow: string; title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <>
      <section className="border-b border-border">
        <Container className="py-14 lg:py-20">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Display as="h1" className="mt-4 max-w-[14ch] break-words text-[32px] sm:text-[44px] lg:text-[56px]">
            {title}
          </Display>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[13px] font-medium text-muted-foreground" role="note">
            Drög – ekki yfirfarið af lögfræðingi.
          </p>
          <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.6] text-muted-foreground">{intro}</p>
          <p className="vild-num mt-3 text-[13px] text-muted-foreground">Útgáfa 0.1 · {updated}</p>
        </Container>
      </section>

      <Container className="grid gap-12 py-14 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-20">
        {/* Desktop only, and hidden as a whole so it leaves no empty grid row on phones. */}
        <nav className="hidden lg:sticky lg:top-24 lg:block lg:self-start" aria-label="Efnisyfirlit">
          <ol className="border-t border-border">
            {sections.map((s, i) => (
              <li key={s.id} className="border-b border-border">
                <a href={`#${s.id}`} className="flex gap-3 py-3 text-[15px] font-medium hover:text-[hsl(var(--green-500))]">
                  <span className="vild-num w-6 shrink-0 text-muted-foreground">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-[68ch]">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-border py-8 first:border-t-0 first:pt-0">
              <h2 className="text-[22px] font-extrabold tracking-[-0.025em] sm:text-[24px]">
                {/* A real space (not just margin) so the heading's accessible name reads "1. Um skilmálana". */}
                <span className="vild-num mr-1 text-muted-foreground">{i + 1}.</span>{' '}
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 text-[16px] leading-[1.6] text-foreground/85">
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
