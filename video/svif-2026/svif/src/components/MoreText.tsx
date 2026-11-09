import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";

/**
 * One short line on screen, the full text one tap away, never the same sentence twice on screen.
 * - Continuation (the full text starts with the line): the line stays and the rest opens under it.
 * - Swap (a different paragraph): the line and the full text trade height on one curve while the
 *   outgoing one fades out first and the incoming one fades in after it (styles.css .more-*).
 * - No toggle when there is nothing more to read.
 */
export function MoreText({
  line,
  full,
  name,
  tone = "cream",
  className = "",
}: {
  line: string;
  full?: string;
  /** what the text is about, for the toggle's accessible name ("Meira: …") */
  name?: string;
  tone?: "cream" | "ink";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const text =
    tone === "cream"
      ? "text-[14.5px] leading-relaxed text-[color:var(--cream)]/72"
      : "text-[14.5px] leading-relaxed text-[color:var(--ink)]/70";
  const control =
    tone === "cream"
      ? "text-[color:var(--cream)]/70 hover:text-[color:var(--cream)]"
      : "text-[color:var(--ink)]/66 hover:text-[color:var(--ink)]";
  const more = (full ?? "").trim();
  if (!more || more === line.trim()) {
    return (
      <div className={className}>
        <p className={text}>{line}</p>
      </div>
    );
  }
  const continues = more.startsWith(line.trim());
  const rest = continues ? more.slice(line.trim().length).trim() : more;
  const label = open ? "Minna" : "Meira";
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={className}>
      {continues ? (
        <p className={text}>{line}</p>
      ) : (
        <div
          className="more-line"
          data-state={open ? "open" : "closed"}
          aria-hidden={open || undefined}
        >
          <div>
            <p className={text}>{line}</p>
          </div>
        </div>
      )}
      <Collapsible.Content className="more-content">
        <p className={`${text} ${continues ? "mt-2" : ""}`}>{rest}</p>
      </Collapsible.Content>
      <Collapsible.Trigger
        className={`group/m -ml-0.5 mt-1 inline-flex min-h-[44px] cursor-pointer items-center gap-3 transition-colors duration-200 ${control}`}
        aria-label={name ? `${label}: ${name}` : undefined}
      >
        <span
          aria-hidden
          className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/40 transition-colors duration-200"
        >
          <span className="absolute h-px w-2.5 bg-current" />
          <span className="absolute h-2.5 w-px bg-current transition-transform duration-[400ms] ease-[cubic-bezier(.165,.84,.44,1)] group-data-[state=open]/m:rotate-90 group-data-[state=open]/m:scale-y-0" />
        </span>
        <span className="label-caps text-[length:max(10.5px,0.6rem)]">{label}</span>
      </Collapsible.Trigger>
    </Collapsible.Root>
  );
}
