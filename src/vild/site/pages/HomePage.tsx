import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedNumber, Chip } from '../../components/kit';
import { CoinMark } from '../../components/brand';
import { isSingular } from '../../lib/format';
import { EASE_OUT, fadeIn, fadeUp, staggerParent, useMotionAllowed, useRevealProps } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import { useLocations, useOffers, useProducts } from '../../lib/queries';
import { CardVisual } from '../components/CardVisual';
import { CreditCalculator } from '../components/CreditCalculator';
import { DrawnMarker } from '../components/DrawnMarker';
import { FaqAccordion } from '../components/FaqAccordion';
import { IcelandMap } from '../components/IcelandMap';
import { groupByCity } from '../components/iceland-geo';
import { LinkButton } from '../components/LinkButton';
import { NumberedList } from '../components/NumberedList';
import { PhoneMock } from '../components/PhoneMock';
import { ProductCarousel } from '../components/ProductCarousel';
import { Container, Display, Eyebrow, Headline, Lead, Reveal, SplitWords } from '../components/layout';
import { usePageTitle } from '../components/usePageTitle';
import { HOME_FAQ } from '../content/faq';

const STEPS = [
  { title: 'Skráðu þig með rafrænum skilríkjum.', body: 'Einu sinni, í appinu. Eftir það dugar símanúmerið. Aðgangurinn er þinn og enginn annar getur safnað á hann.' },
  { title: 'Borgaðu eins og venjulega og sýndu VILD-kortið í símanum.', body: 'Fullt verð, með kortinu þínu eða símanum. Starfsmaðurinn skannar VILD-kortið áður en kaupin eru kláruð.' },
  { title: 'Inneignin kemur um leið – og bíður þín næst.', body: 'Krónurnar birtast í appinu á sama augnabliki. Þú nýtir þær næst þegar þú borðar hjá sömu keðju, á hvaða stað sem er.' },
];

const MARGINS = [
  { label: 'Matvöruverslun', pct: 10, example: 'Smjör 400 kr. → +20 kr.' },
  { label: 'Veitingastaður', pct: 30, example: 'Kvöldverður fyrir tvo 8.000 kr. → +1.200 kr.' },
];

/** The notification lands 900 ms after the balance has finished counting: first the money, then the news. */
const NOTIFY_AFTER = 900;

/**
 * The hero copy: eyebrow, the headline word by word, then – once the headline
 * is set – lead, buttons and facts, 80 ms apart. Under reduced motion it is
 * simply there.
 */
function HeroCopy() {
  const reduced = useReducedMotion();
  return (
    <motion.div className="max-w-[600px]" variants={staggerParent(0.08, 0.05)} initial={reduced ? false : 'hidden'} animate="show">
      <motion.div variants={fadeIn}>
        <Eyebrow className="text-[hsl(var(--green-700))]">Inneign í stað afsláttar</Eyebrow>
      </motion.div>
      <Display className="mt-4">
        <SplitWords text="Borgaðu fullt verð. Fáðu hluta til baka." />
      </Display>
      {/* Starts 0.21 s in and waits 0.55 s more: the last word (0.37 s + its ease-out rise) has landed by then. */}
      <motion.div variants={staggerParent(0.08, 0.55)}>
        <motion.p variants={fadeUp} className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] text-[hsl(var(--green-900))]/80 sm:text-[19px]">
          VILD safnar krónum fyrir þig þegar þú borðar hjá samstarfsstöðum. Inneignin bíður þín næst – hjá sömu keðju.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
          <LinkButton to={href(paths.app)} size="lg" className="w-full sm:w-auto">
            Sækja appið
          </LinkButton>
          <LinkButton to="#svona-virkar" anchor variant="secondary" size="lg" className="w-full border-[hsl(var(--green-900))]/15 bg-white/70 hover:bg-white sm:w-auto">
            Svona virkar þetta
          </LinkButton>
        </motion.div>
        {/* The dot trails each fact but the last, so a wrapped line never starts with one. */}
        <motion.ul variants={fadeIn} className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] font-medium text-[hsl(var(--green-700))] [&>li:not(:last-child)]:after:ml-2.5 [&>li:not(:last-child)]:after:content-['·']">
          <li>Ein króna = ein króna</li>
          <li>Gildir í 24 mánuði</li>
          <li>Rafræn skilríki</li>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}

/** The phone and, once its balance has landed, the push notification that explains it. */
function HeroPhone({ products }: { products: ReturnType<typeof useProducts>['data'] }) {
  const loops = useMotionAllowed();
  const reduced = useReducedMotion();
  const [notified, setNotified] = useState(false);
  const timer = useRef<number | null>(null);
  // The card always follows the balance; under reduced motion the balance is final at once and the card comes with it.
  const onSettled = useCallback(() => {
    if (timer.current !== null) return;
    timer.current = window.setTimeout(() => setNotified(true), loops ? NOTIFY_AFTER : 0);
  }, [loops]);
  // Reset on cleanup too, so a remount (StrictMode, or reduced motion where the balance settles on mount) can schedule it again.
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  return (
    <div className="relative flex justify-center pt-20 sm:pt-14 lg:justify-end lg:pr-6 lg:pt-12">
      <PhoneMock products={products} onBalanceSettled={onSettled} />
      <div className="absolute left-1/2 top-0 w-[240px] -translate-x-[62%] sm:w-[260px] lg:left-0 lg:translate-x-0" aria-hidden="true">
        <AnimatePresence>
          {notified && (
            <motion.div
              className="rounded-2xl bg-white p-3 shadow-[var(--shadow-md)]"
              initial={reduced ? false : { opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.9 }}
            >
              <div className="flex items-start gap-2.5">
                <CoinMark size={28} />
                <div className="min-w-0">
                  <p className="vild-eyebrow text-muted-foreground">VILD · rétt í þessu</p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
                    Þú fékkst inneign frá Lúnu.{' '}
                    <DrawnMarker className="vild-num" delay={0.35}>
                      +1.495 kr.
                    </DrawnMarker>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Two margin bars that grow from nothing while their percentages count up. */
function MarginBars() {
  const ref = useRef<HTMLDListElement>(null);
  const allowed = useMotionAllowed();
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const play = inView || !allowed;
  return (
    <dl ref={ref} className="space-y-6">
      {MARGINS.map((row, i) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between text-[14px]">
            <dt className="font-semibold">{row.label}</dt>
            <dd className="vild-num font-semibold text-[hsl(var(--mint-300))]">
              ~<AnimatedNumber value={play ? row.pct : 0} suffix="% álagning" duration={900} />
            </dd>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-3 rounded-full bg-[hsl(var(--mint-300))]"
              style={{ width: `${(row.pct / 30) * 100}%` }}
              initial={allowed ? { x: '-100%' } : false}
              animate={play ? { x: 0 } : undefined}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: i * 0.15 }}
            />
          </div>
          <p className="vild-num mt-2 text-[13px] text-white/60">{row.example}</p>
        </div>
      ))}
    </dl>
  );
}

/** A second mint layer that breathes very slowly over the closing field: 0 → 0.12 over 8 s, mirrored, only while on screen. */
function Breath() {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const inView = useInView(ref, { amount: 0.2 });
  const on = allowed && inView;
  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(var(--mint-50)),transparent_65%)]"
      animate={on ? { opacity: [0, 0.12] } : { opacity: 0 }}
      transition={on ? { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } : { duration: 0.6 }}
    />
  );
}

/** Rows that rise in one after another once the list is in view. */
function StaggerList({ children, className, ...rest }: { children: ReactNode; className?: string; 'aria-label'?: string }) {
  const reveal = useRevealProps();
  return (
    <motion.ul className={className} variants={staggerParent(0.06)} {...reveal} {...rest}>
      {children}
    </motion.ul>
  );
}

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
          <HeroCopy />
          <HeroPhone products={products.data} />
        </Container>
      </section>

      {/* b. Svona virkar VILD */}
      <section id="svona-virkar" className="scroll-mt-16">
        <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_400px] lg:gap-20 lg:py-28">
          <div>
            <Reveal as="header">
              <Eyebrow>Svona virkar VILD</Eyebrow>
              <Headline className="mt-3">Þrjú skref. Ekkert smáletur.</Headline>
            </Reveal>
            <NumberedList items={STEPS} className="mt-10" />
          </div>
          <div className="flex flex-col items-center gap-4 lg:items-end lg:pt-24">
            <CardVisual tilt={2} />
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
          <Reveal as="header" className="flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Hjá Lúnu núna</Eyebrow>
              <Headline className="mt-3">Krónur til baka í dag</Headline>
            </div>
            <Link to={href(paths.app)} className="-my-3 inline-flex shrink-0 items-center gap-1 py-3 text-[15px] font-semibold text-[hsl(var(--green-500))]">
              Sjá allt
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
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
            <StaggerList className="mt-8 border-t border-border" aria-label="Staðir eftir bæjarfélagi">
              {(cities.length ? cities : [{ city: 'Sæki staði', count: 0, lat: 0, lng: 0 }]).map((c) => (
                <motion.li key={c.city} variants={fadeUp} className="flex items-baseline justify-between border-b border-border py-3 text-[16px]">
                  <span className="font-semibold">{c.city}</span>
                  <span className="vild-num text-muted-foreground">{c.count ? `${c.count} ${isSingular(c.count) ? 'staður' : 'staðir'}` : '…'}</span>
                </motion.li>
              ))}
            </StaggerList>
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
          <MarginBars />
        </Container>
      </section>

      {/* g. Spurningar */}
      <section>
        <Container className="grid gap-10 py-20 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-28">
          <Reveal as="header">
            <Eyebrow>Spurningar</Eyebrow>
            <Headline className="mt-3">Það sem fólk spyr um.</Headline>
            <Link to={href(paths.siteFaq)} className="-mb-3 mt-2 inline-flex items-center gap-1 py-3 text-[15px] font-semibold text-[hsl(var(--green-500))]">
              Fleiri spurningar
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Reveal>
          <FaqAccordion items={HOME_FAQ} />
        </Container>
      </section>

      {/* h. Lokakall */}
      <section className="relative overflow-hidden bg-[hsl(var(--mint-300))] text-[hsl(var(--green-900))]">
        <Breath />
        <Container className="relative flex flex-col gap-8 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28">
          <Display as="h2" className="max-w-[16ch]">
            Næsta máltíð er þegar byrjuð að borga sig.
          </Display>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <LinkButton to={href(paths.app)} size="lg">
              Sækja appið
            </LinkButton>
            <p className="text-[13px] font-medium text-[hsl(var(--green-700))]">Ókeypis app. Ekkert áskriftargjald.</p>
          </div>
        </Container>
      </section>
    </>
  );
}
