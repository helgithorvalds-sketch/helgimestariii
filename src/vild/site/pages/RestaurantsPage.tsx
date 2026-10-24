import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AnimatedNumber, Button, Chip, CreditTag, ProductImage } from '../../components/kit';
import { sectors as SEED_SECTORS } from '../../data/seed';
import { formatISK } from '../../lib/format';
import { DUR, EASE_IN_OUT, EASE_OUT, fadeUp, spring, staggerParent, useMotionAllowed } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import { useProducts, useSectors } from '../../lib/queries';
import { CreditCalculator } from '../components/CreditCalculator';
import { DrawnMarker } from '../components/DrawnMarker';
import { FaqAccordion } from '../components/FaqAccordion';
import { LinkButton } from '../components/LinkButton';
import { NumberedList } from '../components/NumberedList';
import { Container, Display, Eyebrow, Headline, Lead, Reveal } from '../components/layout';
import { usePageTitle } from '../components/usePageTitle';
import { MERCHANT_FAQ } from '../content/faq';
import { POS_CONNECTED, listWithOg } from '../content/pos';

const POS_NAMES = listWithOg(POS_CONNECTED);

const WHAT_YOU_GET = [
  { title: 'Einfalt stjórnborð.', body: 'Veldu prósentu fyrir keðjuna, hækkaðu hana á einstökum réttum eða í hádeginu. Virkt um leið og þú vistar.' },
  { title: 'Tenging við kassakerfið.', body: `${POS_NAMES} – eða skönnun á VILD-kortinu við kassann ef kerfið er annað. Flestir staðir eru komnir í gang innan viku.` },
  { title: 'Uppgjör mánaðarlega.', body: 'Veitt, nýtt, útrunnin og útistandandi inneign, sundurliðuð á staði. Það sem bókarinn þarf, á einu blaði.' },
  { title: 'Gögn um endurkomur.', body: 'Hversu margir komu aftur, hvað þeir keyptu og hvaða réttir skila mestu. Ekki hverjir þeir eru – bara hvað virkar.' },
];

type FormState = { name: string; company: string; email: string; phone: string; message: string };
const EMPTY: FormState = { name: '', company: '', email: '', phone: '', message: '' };

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.name.trim()) e.name = 'Vantar nafn.';
  if (!f.company.trim()) e.company = 'Vantar nafn fyrirtækis.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Netfangið lítur ekki rétt út.';
  if (f.phone.replace(/\D/g, '').length < 7) e.phone = 'Símanúmer er 7 tölustafir.';
  return e;
}

/** The merchant portal's credit picker, reduced to the one control that matters. */
function CreditPickerMock() {
  const [pct, setPct] = useState(10);
  const products = useProducts('m_luna');
  // Pepperoni has no rule of its own, so the chain-wide rate is exactly what a guest gets for it (10% → +329 kr., as on the home page).
  const example = products.data?.find((p) => p.id === 'p_pepperoni') ?? { name: 'Pepperoni', price: 3290, image: '/vild/img/products/pepperoni.jpg' };
  const back = Math.round((example.price * pct) / 100);

  // The example amount swells a little and settles with a spring each time the percentage changes.
  const scale = useMotionValue(1);
  const allowed = useMotionAllowed();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!allowed) return;
    scale.set(1.08);
    const c = animate(scale, 1, spring);
    return () => c.stop();
  }, [pct, allowed, scale]);

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7" aria-label="Dæmi um stjórnborð">
      <div className="flex items-center justify-between">
        <p className="vild-eyebrow">Inneign · öll keðjan</p>
        <Chip tone="mint">Virkt</Chip>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <Button variant="secondary" size="md" className="h-12 w-12 rounded-full px-0" aria-label="Lækka prósentu" onClick={() => setPct((p) => Math.max(0, p - 5))} disabled={pct <= 0}>
          <Minus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <p className="text-[64px] font-extrabold leading-none tracking-[-0.04em] text-[hsl(var(--green-500))] sm:text-[80px]" aria-live="polite">
          <AnimatedNumber value={pct} suffix="%" duration={450} />
        </p>
        <Button variant="secondary" size="md" className="h-12 w-12 rounded-full px-0" aria-label="Hækka prósentu" onClick={() => setPct((p) => Math.min(50, p + 5))} disabled={pct >= 50}>
          <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">til baka af hverjum kaupum</p>
      <div className="mt-6 flex items-center gap-4 border-t border-border pt-5">
        <ProductImage src={example.image} name={example.name} alt={example.name} className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{example.name}</p>
          <p className="vild-num text-[14px] text-muted-foreground">{formatISK(example.price)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          {/* Counts with the percentage above (same 450 ms), so the two never disagree mid-step. */}
          <motion.span style={{ scale }} className="inline-flex origin-center">
            <CreditTag size="lg">
              +<AnimatedNumber value={back} duration={450} />
            </CreditTag>
          </motion.span>
        </div>
      </div>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  const field = (k: keyof FormState, label: string, props: Record<string, string> = {}) => (
    <div>
      <Label htmlFor={`contact-${k}`} className="text-[13px] font-medium text-muted-foreground">
        {label}
      </Label>
      <Input id={`contact-${k}`} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `contact-${k}-error` : undefined} className={cn('mt-1.5 h-11 rounded-xl border-border bg-secondary text-[15px]', errors[k] && 'border-destructive')} {...props} />
      {errors[k] && (
        <p id={`contact-${k}-error`} className="mt-1 text-[13px] font-medium text-destructive">
          {errors[k]}
        </p>
      )}
    </div>
  );

  // The form and the thank-you swap with a crossfade; the exit is quicker than the enter.
  const swap = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
    exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN_OUT } },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div key="sent" {...swap} className="rounded-2xl border border-border bg-white p-8 sm:p-10" role="status" aria-live="polite">
          <motion.span className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))]" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.12 }}>
            <Check className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
          </motion.span>
          <p className="mt-5 text-[24px] font-extrabold leading-tight tracking-[-0.025em]">Takk. Við heyrum í þér innan tveggja virkra daga.</p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Við skrifum á {form.email.trim()}. Ef það liggur á: <a href="mailto:hallo@vild.is" className="font-semibold text-[hsl(var(--green-500))]">hallo@vild.is</a>.
          </p>
        </motion.div>
      ) : (
        <motion.form key="form" {...swap} onSubmit={submit} noValidate className="rounded-2xl border border-border bg-white p-5 sm:p-8" aria-label="Hafa samband">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('name', 'Nafn', { autoComplete: 'name' })}
            {field('company', 'Fyrirtæki', { autoComplete: 'organization' })}
            {field('email', 'Netfang', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
            {field('phone', 'Sími', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
          </div>
          <div className="mt-4">
            <Label htmlFor="contact-message" className="text-[13px] font-medium text-muted-foreground">
              Skilaboð
            </Label>
            <Textarea id="contact-message" value={form.message} onChange={set('message')} rows={4} placeholder="Hvað heitir keðjan, hversu margir staðir, hvaða kassakerfi?" className="mt-1.5 rounded-xl border-border bg-secondary text-[15px]" />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" size="lg">
              Senda
            </Button>
            <p className="text-[13px] text-muted-foreground">Við svörum innan tveggja virkra daga.</p>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default function RestaurantsPage() {
  usePageTitle('Fyrir veitingastaði – VILD');
  const sectors = useSectors();
  // The five sectors are known up front: render them at once and let live data replace them, so the hero never waits on the query.
  const sectorRows = sectors.data ?? SEED_SECTORS;
  const motionAllowed = useMotionAllowed();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <Container className="grid gap-12 py-16 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-16 lg:py-24">
          <div>
            <Eyebrow>Fyrir veitingastaði</Eyebrow>
            <Display className="mt-4 max-w-[14ch]">Ein keðja í hverjum geira. Þín?</Display>
            <Lead className="mt-6 max-w-[46ch]">
              VILD tekur eina keðju inn í hvern geira: eina í veitingum, eina í kaffi, eina í eldsneyti. Sú sem er með fær alla inneignina í sínum geira – og gestina sem fylgja henni. Hinar bíða.
            </Lead>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="#hafa-samband" anchor size="lg" className="w-full sm:w-auto">
                Hafa samband
              </LinkButton>
              <LinkButton to={href(paths.merchantLogin)} variant="secondary" size="lg" className="w-full sm:w-auto">
                Innskráning fyrirtækja
              </LinkButton>
            </div>
          </div>
          <motion.ul className="border-t border-border" aria-label="Geirar" variants={staggerParent(0.06, 0.2)} initial={motionAllowed ? 'hidden' : false} animate="show">
            {sectorRows.map((s) => (
              <motion.li key={s.slug} variants={fadeUp} className="flex items-center justify-between gap-4 border-b border-border py-4">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold">{s.name}</p>
                  <p className="text-[13px] text-muted-foreground">{s.status === 'live' ? 'Lúna · 9 staðir' : 'Engin keðja enn'}</p>
                </div>
                <Chip tone={s.status === 'live' ? 'green' : 'outline'}>{s.status === 'live' ? 'Í notkun' : 'Laust'}</Chip>
              </motion.li>
            ))}
          </motion.ul>
        </Container>
      </section>

      {/* Margin math */}
      <section className="bg-[hsl(var(--surface-2))]">
        <Container className="grid gap-10 py-20 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:py-28">
          <div>
            <Reveal as="header">
              <Eyebrow>Reikningsdæmið</Eyebrow>
              <Headline className="mt-3">Afsláttur kostar peninga. Inneign kostar bara vöruna.</Headline>
            </Reveal>
            <Lead className="mt-5 max-w-[40ch]">
              Þegar þú gefur 1.000 kr. afslátt vantar 1.000 kr. í kassann. Þegar þú gefur 1.000 kr. inneign borgar þú bara hráefnið í réttinum sem gesturinn fær fyrir hana. Ef hráefnið er 30% af verðinu eru það 300 kr. – og gesturinn kom aftur til að nýta hana.
            </Lead>
            <blockquote className="mt-8 border-l-2 border-[hsl(var(--green-500))] pl-5">
              <p className="text-[18px] font-bold leading-snug tracking-[-0.015em] sm:text-[20px]">
                Kvöldverður fyrir tvo, <span className="vild-num">8.000 kr.</span> Gesturinn fær 15% til baka:{' '}
                <DrawnMarker className="vild-num">+1.200 kr.</DrawnMarker>
              </p>
              <p className="mt-2 text-[14px] text-muted-foreground">Staðurinn fær fullt verð í kassann í kvöld. Þegar gesturinn kemur aftur og nýtir inneignina kostar hún staðinn um 360 kr. í hráefni – 30% af 1.200 kr.</p>
            </blockquote>
          </div>
          <CreditCalculator mode="merchant" />
        </Container>
      </section>

      {/* Hvað færðu + stjórnborð */}
      <section>
        <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_420px] lg:gap-20 lg:py-28">
          <div>
            <Reveal as="header">
              <Eyebrow>Hvað færðu</Eyebrow>
              <Headline className="mt-3">Þú velur prósentuna. Við sjáum um restina.</Headline>
            </Reveal>
            <NumberedList items={WHAT_YOU_GET} className="mt-10" />
          </div>
          <div className="lg:pt-24">
            <CreditPickerMock />
            <p className="mt-4 text-[13px] text-muted-foreground">Stjórnborðið, í einni stillingu. Prósentan gildir strax á öllum stöðum keðjunnar.</p>
          </div>
        </Container>
      </section>

      {/* Hafa samband */}
      <section id="hafa-samband" className="scroll-mt-16 bg-[hsl(var(--surface-2))]">
        <Container className="grid gap-10 py-20 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-28">
          <Reveal as="header">
            <Eyebrow>Hafa samband</Eyebrow>
            <Headline className="mt-3">Segðu okkur frá keðjunni.</Headline>
            <p className="mt-5 max-w-[34ch] text-[16px] leading-[1.5] text-muted-foreground">Hvað heitir hún, hvað eru staðirnir margir og hvaða kassakerfi notið þið. Við svörum með tillögu að prósentu og tengingu.</p>
            <p className="mt-5 text-[15px]">
              {/* py-3 -my-3: a 44px touch target without moving the text. */}
              <a href="mailto:hallo@vild.is" className="-my-3 inline-block py-3 font-semibold text-[hsl(var(--green-500))]">
                hallo@vild.is
              </a>
            </p>
          </Reveal>
          <ContactForm />
        </Container>
      </section>

      {/* Merchant FAQ */}
      <section>
        <Container className="grid gap-10 py-20 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-28">
          <Reveal as="header">
            <Eyebrow>Spurningar veitingastaða</Eyebrow>
            <Headline className="mt-3">Það sem eigendur spyrja um.</Headline>
            <Link to={href(paths.merchantLogin)} className="-mb-3 mt-2 inline-flex items-center gap-1 py-3 text-[15px] font-semibold text-[hsl(var(--green-500))]">
              Innskráning fyrirtækja
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Reveal>
          <FaqAccordion items={MERCHANT_FAQ} />
        </Container>
      </section>
    </>
  );
}
