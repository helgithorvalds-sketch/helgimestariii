import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Sequence, Reveal, Hairline } from "@/components/motion/Reveal";
import { Eyebrow, DisplayTitle } from "@/components/SvifBits";

export interface Faq {
  q: string;
  a: string;
}

/**
 * Questions on hairlines. One open at a time; height + opacity, 400 ms settle both ways.
 * The answers are long-form text, so they do not reveal on scroll — only the list fades in once.
 */
export function FaqSection({ faqs, tone = "cream" }: { faqs: Faq[]; tone?: "cream" | "peach" }) {
  return (
    <section
      id="spurningar"
      className={`relative scroll-mt-20 py-24 md:py-32 ${tone === "peach" ? "bg-[color:var(--peach)]" : "bg-[color:var(--cream)]"}`}
    >
      <div className="site-container grid gap-12 md:grid-cols-12 md:gap-10">
        <Sequence className="md:col-span-4">
          <Eyebrow>Spurt og svarað</Eyebrow>
          <DisplayTitle caps="Algengar" accent="spurningar." size="md" className="mt-5" />
        </Sequence>

        <Sequence className="md:col-span-8 md:pt-1">
          <Reveal kind="block" role="body">
            <AccordionPrimitive.Root type="single" collapsible className="w-full">
              <Hairline role="body" className="text-[color:var(--ink)]/14" />
              {faqs.map((f, i) => (
                <AccordionPrimitive.Item key={f.q} value={`q${i}`} className="group/item relative">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="group/t flex min-h-[64px] flex-1 cursor-pointer items-center gap-5 py-5 text-left font-[family-name:var(--font-display)] text-[16px] font-normal leading-snug tracking-[0.03em] text-[color:var(--ink)] md:min-h-[76px] md:text-[18px]">
                      <span
                        aria-hidden
                        className="label-caps hidden w-6 shrink-0 text-[length:max(10.5px,0.6rem)] text-[color:var(--ink)]/66 sm:inline"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">{f.q}</span>
                      <span
                        aria-hidden
                        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--ink)]/18 transition-colors duration-200 group-hover/t:border-[color:var(--ink)]/50"
                      >
                        <span className="absolute h-px w-3 bg-current" />
                        <span className="absolute h-3 w-px bg-current transition-transform duration-[400ms] ease-[cubic-bezier(.165,.84,.44,1)] group-data-[state=open]/t:rotate-90 group-data-[state=open]/t:scale-y-0" />
                      </span>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionPrimitive.Content className="acc-content">
                    <p className="max-w-[40rem] pb-7 pr-12 text-[15px] leading-relaxed text-[color:var(--ink)]/72 sm:pl-11">
                      {f.a}
                    </p>
                  </AccordionPrimitive.Content>
                  <span aria-hidden className="block h-px bg-[color:var(--ink)]/14" />
                </AccordionPrimitive.Item>
              ))}
            </AccordionPrimitive.Root>
          </Reveal>
        </Sequence>
      </div>
    </section>
  );
}
