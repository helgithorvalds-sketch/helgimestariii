import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { href, paths } from '../../lib/paths';
import { FaqAccordion } from '../components/FaqAccordion';
import { Container, Display, Eyebrow, Lead } from '../components/layout';
import { usePageTitle } from '../components/usePageTitle';
import { FAQ_GROUPS } from '../content/faq';

export default function FaqPage() {
  usePageTitle('Spurningar – VILD');
  const total = FAQ_GROUPS.reduce((n, g) => n + g.items.length, 0);
  return (
    <>
      <section className="border-b border-border">
        <Container className="py-14 lg:py-20">
          <Eyebrow>Spurningar</Eyebrow>
          <Display as="h1" className="mt-4 max-w-[14ch] text-[36px] sm:text-[44px] lg:text-[56px]">
            {total} svör. Stutt og skýr.
          </Display>
          <Lead className="mt-5 max-w-[44ch]">Finnirðu ekki svarið, sendu línu á hallo@vild.is. Við svörum innan tveggja virkra daga.</Lead>
        </Container>
      </section>

      <Container className="grid gap-12 py-14 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-20">
        <nav className="lg:sticky lg:top-24 lg:self-start" aria-label="Efnisyfirlit">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0 lg:border-t lg:border-border">
            {FAQ_GROUPS.map((g) => (
              <li key={g.id} className="lg:border-b lg:border-border">
                <a href={`#${g.id}`} className="inline-flex h-9 items-center rounded-full border border-border bg-white px-3.5 text-[14px] font-medium hover:bg-secondary lg:h-auto lg:w-full lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-3.5 lg:text-[16px] lg:font-semibold lg:hover:bg-transparent lg:hover:text-[hsl(var(--green-500))]">
                  {g.title}
                  <span className="vild-num ml-2 text-[13px] font-medium text-muted-foreground">{g.items.length}</span>
                </a>
              </li>
            ))}
          </ul>
          <Link to={href(paths.siteForRestaurants)} className="mt-6 hidden items-center gap-1 text-[15px] font-semibold text-[hsl(var(--green-500))] lg:inline-flex">
            Fyrir veitingastaði
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </nav>

        <div className="space-y-14">
          {FAQ_GROUPS.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-24">
              <h2 className="text-[24px] font-extrabold tracking-[-0.025em] sm:text-[28px]">{g.title}</h2>
              <FaqAccordion items={g.items} className="mt-5" />
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
