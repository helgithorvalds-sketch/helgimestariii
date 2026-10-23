import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chip, SectionHeader } from '../../components/kit';
import { CoinMark } from '../../components/brand';
import { formatISK, isSingular } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useLocations, useOffers, useProducts } from '../../lib/queries';
import { CardVisual } from '../components/CardVisual';
import { CreditCalculator } from '../components/CreditCalculator';
import { FaqAccordion } from '../components/FaqAccordion';
import { IcelandMap, groupByCity } from '../components/IcelandMap';
import { LinkButton } from '../components/LinkButton';
import { NumberedList } from '../components/NumberedList';
import { PhoneMock } from '../components/PhoneMock';
import { ProductCarousel } from '../components/ProductCarousel';
import { Container, Display, Eyebrow, Headline, Lead, Reveal } from '../components/layout';
import { usePageTitle } from '../components/usePageTitle';
import { HOME_FAQ } from '../content/faq';

const STEPS = [
  { title: 'Skráðu þig með rafrænum skilríkjum.', body: 'Einu sinni, í appinu. Eftir það dugar símanúmerið. Aðgangurinn er þinn og enginn annar getur safnað á hann.' },
  { title: 'Borgaðu eins og venjulega og sýndu VILD-kortið í símanum.', body: 'Fullt verð, með kortinu þínu eða símanum. Starfsmaðurinn skannar VILD-kortið áður en kaupin eru kláruð.' },
  { title: 'Inneignin kemur um leið – og bíður þín næst.', body: 'Krónurnar birtast í appinu á sama augnabliki. Þú nýtir þær næst þegar þú borðar hjá sömu keðju, á hvaða stað sem er.' },
];

export default function HomePage() {
  usePageTitle('VILD – Inneign í stað afsláttar');
  const products = useProducts('m_luna');
  const locations = useLocations();
  const offers = useOffers();
  const cities = groupByCity(locations.data ?? []);
  const lunchOffer = offers.data?.find((o) => o.tag === 'Hádegi') ?? offers.data?.[0];

  return (
    <>
      {/* a. Hero */}
      <section className="bg-[hsl(var(--mint-300))] text-[hsl(var(--green-900))]">
        <Container className="grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-[55fr_45fr] lg:gap-8 lg:py-24">
          <div className="max-w-[600px]">
            <Eyebrow className="text-[hsl(var(--green-700))]">Inneign í stað afsláttar</Eyebrow>
            <Display className="mt-4">Borgaðu fullt verð. Fáðu hluta til baka.</Display>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] text-[hsl(var(--green-900))]/80 sm:text-[19px]">
              VILD safnar krónum fyrir þig þegar þú borðar hjá samstarfsstöðum. Inneignin bíður þín næst – hjá sömu keðju.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to={href(paths.app)} size="lg">
                Sækja appið
              </LinkButton>
              <LinkButton to="#svona-virkar" anchor variant="secondary" size="lg" className="border-[hsl(var(--green-900))]/15 bg-white/70 hover:bg-white">
                Svona virkar þetta
              </LinkButton>
            </div>
            <p className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] font-medium text-[hsl(var(--green-700))]">
              <span>Ein króna = ein króna</span>
              <span aria-hidden="true">·</span>
              <span>Gildir í 24 mánuði</span>
              <span aria-hidden="true">·</span>
              <span>Rafræn skilríki</span>
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:pr-6">
            <PhoneMock products={products.data} />
            <div className="absolute -left-1 top-10 w-[220px] rounded-2xl bg-white p-3 shadow-[var(--shadow-md)] sm:left-0 sm:top-14 sm:w-[250px] lg:-left-6" aria-hidden="true">
              <div className="flex items-start gap-2.5">
                <CoinMark size={28} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">VILD · rétt í þessu</p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
                    Þú fékkst inneign frá Lúnu. <span className="vild-marker vild-num">+1.495 kr.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* b. Svona virkar VILD */}
      <section id="svona-virkar" className="scroll-mt-16">
        <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_400px] lg:gap-20 lg:py-28">
          <div>
            <Reveal as="header">
              <Eyebrow>Svona virkar VILD</Eyebrow>
              <Headline className="mt-3">Þrjú skref. Ekkert smáa letur.</Headline>
            </Reveal>
            <NumberedList items={STEPS} className="mt-10" />
          </div>
          <div className="flex flex-col items-center gap-4 lg:items-end lg:pt-24">
            <CardVisual className="rotate-[2deg]" />
            <p className="max-w-[32ch] text-center text-[13px] text-muted-foreground lg:text-right">Kortið í appinu. Það er það eina sem þarf að sýna við kassann.</p>
          </div>
        </Container>
      </section>

      {/* c. Inneign, ekki afsláttur */}
      <section className="bg-[hsl(var(--surface-2))]">
        <Container className="grid gap-10 py-20 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:py-28">
          <div className="lg:pt-2">
            <Reveal as="header">
              <Eyebrow>Kjarninn</Eyebrow>
              <Headline className="mt-3">Inneign, ekki afsláttur.</Headline>
            </Reveal>
            <Lead className="mt-5 max-w-[40ch]">
              Afsláttur er króna sem fer út um dyrnar og sést aldrei aftur. Inneign er króna sem bíður þín hjá sömu keðju. Hún kostar staðinn bara vöruna – og hún togar þig aftur.
            </Lead>
            <blockquote className="mt-8 border-l-2 border-[hsl(var(--green-500))] pl-5">
              <p className="text-[18px] font-bold leading-snug tracking-[-0.015em] sm:text-[20px]">
                Þrjár samlokur: <span className="vild-num">6.000 kr.</span> í stað <span className="vild-num">4.500 kr.</span> Og gesturinn kom aftur.
              </p>
              <p className="mt-2 text-[14px] text-muted-foreground">Ein samloka kostar 3.000 kr. Með 50% til baka borgar gesturinn fullt verð tvisvar og fær þá þriðju fyrir inneignina.</p>
            </blockquote>
          </div>
          <CreditCalculator mode="guest" />
        </Container>
      </section>

      {/* d. Krónur til baka í dag */}
      <section>
        <Container className="py-20 lg:py-28">
          <Reveal as="header" className="[&_h2]:text-[28px] [&_h2]:font-extrabold [&_h2]:tracking-[-0.03em] sm:[&_h2]:text-[34px]">
            <SectionHeader eyebrow="Hjá Lúnu núna" title="Krónur til baka í dag" action="Sjá allt" to={href(paths.app)} />
          </Reveal>
          <ProductCarousel products={products.data} loading={products.isLoading} className="mt-8" />
          {lunchOffer && (
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 text-[14px] text-muted-foreground">
              {lunchOffer.tag && <Chip tone="mint">{lunchOffer.tag}</Chip>}
              <span className="font-semibold text-foreground">{lunchOffer.title}</span>
              <span>{lunchOffer.body}</span>
            </div>
          )}
        </Container>
      </section>

      {/* e. Staðir um allt land */}
      <section className="border-t border-border">
        <Container className="grid gap-12 py-20 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16 lg:py-28">
          <div>
            <Reveal as="header">
              <Eyebrow>Staðir um allt land</Eyebrow>
              <Headline className="mt-3">Níu staðir. Ein inneign.</Headline>
            </Reveal>
            <Lead className="mt-5 max-w-[38ch]">Inneign frá Lúnu gildir á öllum stöðum Lúnu, sama hvar þú fékkst hana.</Lead>
            <ul className="mt-8 border-t border-border" aria-label="Staðir eftir bæjarfélagi">
              {(cities.length ? cities : [{ city: 'Sæki staði', count: 0, lat: 0, lng: 0 }]).map((c) => (
                <li key={c.city} className="flex items-baseline justify-between border-b border-border py-3 text-[16px]">
                  <span className="font-semibold">{c.city}</span>
                  <span className="vild-num text-muted-foreground">{c.count ? `${c.count} ${isSingular(c.count) ? 'staður' : 'staðir'}` : '…'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[560px] lg:max-w-none">
            <IcelandMap locations={locations.data ?? []} />
          </div>
        </Container>
      </section>

      {/* f. Fyrir veitingastaði */}
      <section className="vild-dark bg-[hsl(var(--green-900))] text-white">
        <Container className="grid gap-12 py-20 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-16 lg:py-28">
          <div>
            <Reveal as="header">
              <Eyebrow className="text-[hsl(var(--mint-300))]">Fyrir veitingastaði</Eyebrow>
              <Headline className="mt-3 text-white">Inneign kostar bara vöruna.</Headline>
            </Reveal>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.5] text-white/80 sm:text-[19px]">
              Matvöruverslun er með um 10% álagningu og getur gefið 20 kr. til baka af smjörinu. Veitingastaður er með um 30% – þrisvar sinnum meira svigrúm til að gefa til baka, og tilboðin eru þegar til: hádegið, þriðjudagurinn, happy hour.
            </p>
            <LinkButton to={href(paths.siteForRestaurants)} variant="mint" size="lg" className="mt-8">
              Lesa meira
              <ArrowRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </LinkButton>
          </div>
          <dl className="space-y-6">
            {[
              { label: 'Matvöruverslun', pct: 10, example: 'Smjör 400 kr. → +20 kr.' },
              { label: 'Veitingastaður', pct: 30, example: 'Kvöldverður fyrir tvo 8.000 kr. → +1.200 kr.' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between text-[14px]">
                  <dt className="font-semibold">{row.label}</dt>
                  <dd className="vild-num font-semibold text-[hsl(var(--mint-300))]">~{row.pct}% álagning</dd>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-[hsl(var(--mint-300))]" style={{ width: `${(row.pct / 30) * 100}%` }} />
                </div>
                <p className="vild-num mt-2 text-[13px] text-white/60">{row.example}</p>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* g. Spurningar */}
      <section>
        <Container className="grid gap-10 py-20 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-28">
          <Reveal as="header">
            <Eyebrow>Spurningar</Eyebrow>
            <Headline className="mt-3">Það sem fólk spyr um.</Headline>
            <Link to={href(paths.siteFaq)} className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-[hsl(var(--green-500))]">
              Fleiri spurningar
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Reveal>
          <FaqAccordion items={HOME_FAQ} />
        </Container>
      </section>

      {/* h. Lokakall */}
      <section className="bg-[hsl(var(--mint-300))] text-[hsl(var(--green-900))]">
        <Container className="flex flex-col gap-8 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28">
          <Display as="h2" className="max-w-[16ch]">
            Næsta máltíð er þegar byrjuð að borga sig.
          </Display>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <LinkButton to={href(paths.app)} size="lg">
              Sækja appið
            </LinkButton>
            <p className="text-[13px] font-medium text-[hsl(var(--green-700))]">Ókeypis. Rafræn skilríki. {formatISK(0)} í áskrift.</p>
          </div>
        </Container>
      </section>
    </>
  );
}
