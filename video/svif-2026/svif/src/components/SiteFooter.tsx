import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RoofMark } from "@/components/SvifBits";

const LOGO_CREAM = "/svif/logo-cream.png";

export function SiteFooter({
  line = "Nýji kaflinn · bæklingur fyrir nýja húseigendur",
  extra,
}: {
  line?: string;
  extra?: ReactNode;
} = {}) {
  // 44 px tall tap targets, tracked caps at ≥ 10.5 px
  const link =
    "link-wipe inline-flex min-h-[44px] items-center text-[color:var(--cream)]/72 transition-colors duration-200 hover:text-[color:var(--cream)]";
  return (
    <footer
      className="relative overflow-hidden bg-[color:var(--stage-deep)] pb-10 pt-14 text-[color:var(--cream)] md:pt-16"
      data-header="dark"
    >
      <div className="site-container relative">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex items-center gap-5">
            <img src={LOGO_CREAM} alt="SVIF" className="h-7 w-auto object-contain" />
            <span className="hidden h-px w-10 bg-[color:var(--cream)]/25 sm:block" />
            <p className="text-[13px] leading-relaxed text-[color:var(--cream)]/68">{line}</p>
          </div>
          <nav
            aria-label="Síður"
            className="label-caps -my-2 flex flex-wrap gap-x-7 gap-y-0 text-[length:max(10.5px,0.62rem)]"
          >
            <Link to="/" className={link}>
              Forsíða
            </Link>
            <Link to="/fyrirtaeki" className={link}>
              Ný fyrirtæki
            </Link>
            <Link to="/baeklingur" className={link}>
              Bæklingurinn
            </Link>
            <a href="tel:8535147" className={link}>
              853 5147
            </a>
            {extra}
          </nav>
        </div>
        <div className="mt-12 flex items-center gap-4 text-[color:var(--cream)]/30">
          <span className="h-px flex-1 bg-current" />
          <RoofMark className="h-3.5 w-6" />
          <span className="h-px flex-1 bg-current" />
        </div>
        <p className="mt-6 text-balance text-center label-caps text-[length:max(10px,0.58rem)] text-[color:var(--cream)]/62">
          <span className="whitespace-nowrap">Hannað, prentað og sent af SVIF ·</span>{" "}
          <span className="whitespace-nowrap">svif.is ·</span>{" "}
          <span className="whitespace-nowrap">65°N · 19°W</span>
        </p>
      </div>
    </footer>
  );
}
