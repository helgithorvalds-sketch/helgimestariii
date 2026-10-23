import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { FaqItem } from '../content/faq';

/** Hairline accordion: question in 17px/600, answer in body size. */
export function FaqAccordion({ items, className, defaultOpen }: { items: FaqItem[]; className?: string; defaultOpen?: string }) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen} className={cn('border-t border-border', className)}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} id={item.id} className="border-border scroll-mt-24">
          <AccordionTrigger className="gap-4 py-5 text-left text-[17px] font-semibold leading-snug tracking-[-0.01em] hover:no-underline sm:text-[18px] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-[hsl(var(--green-500))]">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-6 text-[15px] leading-[1.55] text-foreground/80 sm:text-[16px]">
            <p className="max-w-[62ch]">{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
