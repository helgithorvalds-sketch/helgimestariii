import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button, Chip, CreditTag, ProductImage } from '../../components/kit';
import { formatISK, formatPct, formatSignedISK } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useProducts, useSectors } from '../../lib/queries';
import { POS_VENDORS } from '../../lib/types';
import { CreditCalculator } from '../components/CreditCalculator';
import { FaqAccordion } from '../components/FaqAccordion';
import { LinkButton } from '../components/LinkButton';
import { NumberedList } from '../components/NumberedList';
import { Container, Display, Eyebrow, Headline, Lead, Reveal } from '../components/layout';
import { usePageTitle } from '../components/usePageTitle';
import { MERCHANT_FAQ } from '../content/faq';

const POS_NAMES = POS_VENDORS.filter((v) => v.id !== 'other' && v.id !== 'regla')
  .map((v) => v.name.replace(/\s*\(.*\)$/, ''))
  .join(', ');

const WHAT_YOU_GET = [
  { title: 'Einfalt stjórnborð.', body: 'Veldu prósentu fyrir keðjuna, hækkaðu hana á einstökum réttum eða í hádeginu. Virkt um leið og þú vistar.' },
  { title: 'Tenging við kassakerfið.', body: `${POS_NAMES} – eða skönnun á VILD-kortinu við kassann ef kerfið er annað. Flestir staðir eru komnir í gang innan viku.` },
  { title: 'Uppgjör mánaðarlega.', body: 'Veitt, nýtt, útrunnið og útistandandi inneign, sundurliðað á staði. Það sem bókarinn þarf, á einu blaði.' },
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
  const example = products.data?.find((p) => p.id === 'p_margherita') ?? { name: 'Margherita', price: 2990, image: '/vild/img/products/margherita.jpg' };
  const back = Math.round((example.price * pct) / 100);
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7" aria-label="Dæmi um stjórnborð">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Inneign · öll keðjan</p>
        <Chip tone="mint">Virkt</Chip>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <Button variant="secondary" size="md" className="h-12 w-12 rounded-full px-0" aria-label="Lækka prósentu" onClick={() => setPct((p) => Math.max(0, p - 5))} disabled={pct <= 0}>
          <Minus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <p className="vild-num text-[64px] font-extrabold leading-none tracking-[-0.04em] text-[hsl(var(--green-500))] sm:text-[80px]" aria-live="polite">
          {formatPct(pct)}
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
          <CreditTag size="lg">{formatSignedISK(back)}</CreditTag>
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

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 sm:p-10" role="status" aria-live="polite">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))]">
          <Check className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </span>
        <p className="mt-5 text-[24px] font-extrabold leading-tight tracking-[-0.025em]">Takk. Við heyrum í þér innan tveggja virkra daga.</p>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Við skrifum á {form.email.trim()}. Ef það liggur á: <a href="mailto:hallo@vild.is" className="font-semibold text-[hsl(var(--green-500))]">hallo@vild.is</a>.
        </p>
      </div>
    );
  }

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

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-border bg-white p-5 sm:p-8" aria-label="Hafa samband">
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
    </form>
  );
}

export default function RestaurantsPage() {
  usePageTitle('Fyrir veitingastaði – VILD');
  const sectors = useSectors();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <Container className="grid gap-12 py-16 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <Eyebrow>Fyrir veitingastaði</Eyebrow>
            <Display className="mt-4 max-w-[14ch]">Ein keðja í hverjum geira. Þín?</Display>
            <Lead className="mt-6 max-w-[46ch]">
              VILD tekur eina keðju inn í hvern geira: eina í veitingum, eina í kaffi, eina í eldsneyti. Sú sem er með fær alla inneignina í sínum geira – og gestina sem fylgja henni. Hinar bíða.
            </Lead>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="#hafa-samband" anchor size="lg">
                Hafa samband
              </LinkButton>
              <LinkButton to={href(paths.merchantLogin)} variant="ghost" size="lg">
                Innskráning fyrirtækja
              </LinkButton>
            </div>
          </div>
          <ul className="border-t border-border" aria-label="Geirar">
            {(sectors.data ?? []).map((s) => (
              <li key={s.slug} className="flex items-center justify-between gap-4 border-b border-border py-4">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold">{s.name}</p>
                  <p className="text-[13px] text-muted-foreground">{s.status === 'live' ? 'Lúna · 9 staðir' : 'Laust'}</p>
                </div>
                <Chip tone={s.status === 'live' ? 'green' : 'outline'}>{s.status === 'live' ? 'Í notkun' : 'Laust'}</Chip>
              </li>
            ))}
          </ul>
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
              Þegar þú gefur 1.000 kr. afslátt vantar 1.000 kr. í kassann. Þegar þú gefur 1.000 kr. inneign borgar þú hráefnið í réttinum sem gesturinn fær fyrir hana – um 300 kr. – og hann kom aftur til að nýta hana.
            </Lead>
            <blockquote className="mt-8 border-l-2 border-[hsl(var(--green-500))] pl-5">
              <p className="text-[18px] font-bold leading-snug tracking-[-0.015em] sm:text-[20px]">
                Kvöldverður fyrir tvo, <span className="vild-num">8.000 kr.</span> Helmingur álagningar til baka: <span className="vild-marker vild-num">+1.200 kr.</span>
              </p>
              <p className="mt-2 text-[14px] text-muted-foreground">Í matvöruverslun með 10% álagningu væri sama hlutfall 20 kr. af smjörstykki. Sami ávinningur fyrir gestinn, án gallans.</p>
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
              <a href="mailto:hallo@vild.is" className="font-semibold text-[hsl(var(--green-500))]">hallo@vild.is</a>
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
            <Link to={href(paths.merchantLogin)} className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-[hsl(var(--green-500))]">
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
