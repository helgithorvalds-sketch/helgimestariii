import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { href, paths } from '../../lib/paths';
import { Container, Display, Eyebrow } from '../components/layout';
import { usePageTitle } from '../components/usePageTitle';

export default function AboutPage() {
  usePageTitle('Um VILD – Inneign í stað afsláttar');
  return (
    <section>
      <Container className="grid gap-12 py-16 lg:grid-cols-[6fr_6fr] lg:gap-20 lg:py-24">
        <div>
          <Eyebrow>Um VILD</Eyebrow>
          <Display as="h1" className="mt-4 max-w-[12ch] text-[36px] sm:text-[44px] lg:text-[56px]">
            Krónur sem bíða þín. Ekki krónur sem gleymast.
          </Display>
          <div className="mt-8 max-w-[58ch] space-y-5 text-[16px] leading-[1.6] text-foreground/85 sm:text-[17px]">
            <p>
              VILD er app fyrir fólk sem borðar úti og fyrir staðina sem það borðar á. Þú borgar fullt verð, hluti kemur til baka sem inneign hjá sömu keðju og bíður þín næst. Ein VILD-króna er ein króna, í 24 mánuði.
            </p>
            <p>
              Hugmyndin er einföld. Afsláttur er peningur sem fer út um dyrnar og sést aldrei aftur. Inneign er peningur sem helst hjá staðnum sem gaf hana – hún kostar staðinn bara hráefnið þegar hún er nýtt, og gesturinn kemur aftur til að nýta hana. Matvöruverslanir hafa reynt þetta, en þar kostar varan sjálf um 90% af verðinu og svigrúmið er eftir því: 20 kr. til baka af smjörstykki. Á veitingastað er hráefnið um 30% af verðinu og tilboðin eru þegar til: hádegið, þriðjudagurinn, happy hour. Þar er svigrúm til að gefa meira til baka, og ástæða til að opna appið.
            </p>
            <p>
              Við tökum eina keðju inn í hvern geira. Inneignin gildir bara þar sem hún var veitt, svo staðirnir geta gefið meira – og þú veist alltaf hvar hún bíður.
            </p>
            <p className="text-muted-foreground">VILD er þróað af Norðurvef. Hönnun og þróun í samstarfi við hönnunarstofu.</p>
          </div>
          {/* py-3 -my-3: 44px touch targets without moving the text. */}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[15px] font-semibold text-[hsl(var(--green-500))]">
            <Link to={href(paths.siteForRestaurants)} className="-my-3 inline-flex items-center gap-1 py-3">
              Fyrir veitingastaði
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link to={href(paths.siteFaq)} className="-my-3 inline-flex items-center gap-1 py-3">
              Spurningar
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <figure className="lg:pt-10">
          <img src="/vild/img/hero-luna.jpg" alt="Salur á veitingastað Lúnu: dökk viðargólf, leðurbekkir og hringborð lögð á borð fyrir kvöldið" className="aspect-[4/5] w-full rounded-2xl object-cover sm:aspect-[4/3] lg:aspect-[4/5]" loading="lazy" decoding="async" width={1600} height={1000} />
          <figcaption className="mt-3 text-[13px] text-muted-foreground">Lúna, fyrsta keðjan í veitingageiranum. Níu staðir um allt land.</figcaption>
        </figure>
      </Container>
    </section>
  );
}
