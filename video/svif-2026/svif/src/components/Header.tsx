import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GLIDE_EVENT, lockScroll, unlockScroll } from "@/lib/scroll";

const LOGO_INK = "/svif/logo-ink.png";
const LOGO_CREAM = "/svif/logo-cream.png";

const defaultNavLinks = [
  { name: "Svona virkar það", href: "#svona-virkar" },
  { name: "Spurt og svarað", href: "#meira" },
  { name: "Bæklingurinn", href: "/baeklingur" },
  { name: "Ný fyrirtæki", href: "/fyrirtaeki" },
];

/* "/path" and "/path#hash" are router links (client-side, with the view transition; the router
   scrolls the hash into view); "#hash" is a same-page anchor (the root's Lenis glide). */
const isRouteLink = (href: string) => href.startsWith("/");
const splitHref = (href: string) => {
  const [to, hash] = href.split("#");
  return { to: to || "/", hash: hash || undefined };
};
function NavLink({
  href,
  className,
  children,
  onClick,
  tabIndex,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
  tabIndex?: number;
}) {
  if (isRouteLink(href)) {
    const { to, hash } = splitHref(href);
    return (
      <Link to={to} hash={hash} className={className} onClick={onClick} tabIndex={tabIndex}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} onClick={onClick} tabIndex={tabIndex}>
      {children}
    </a>
  );
}

export interface HeaderLink {
  name: string;
  href: string;
}

/**
 * Header (research §3.10): transparent over the dark hero, a quiet translucent bar after 80px,
 * hidden while reading down (past 120px), back on any scroll up. Over sections marked
 * data-header="dark" it switches to cream type. Transform and colour only.
 */
export function Header({
  links: navLinks = defaultNavLinks,
  cta = { name: "Bóka pláss", href: "#samband" },
  logoHref = "#top",
}: {
  links?: HeaderLink[];
  cta?: HeaderLink;
  logoHref?: string;
} = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const focusInside = useRef(false);

  // scroll position → scrolled / hidden (one passive listener, rAF-throttled). A glide the site
  // starts (anchor links) keeps the header in place through the landing, so the HEADER_OFFSET band
  // is the bar and not the end of the previous section; hiding resumes on the reader's own scroll.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastY = window.scrollY;
    let raf = 0;
    let held = false;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      setScrolled(y > 80);
      const nearBottom = y + window.innerHeight > document.documentElement.scrollHeight - 160;
      if (y < 120 || reduce || nearBottom || focusInside.current || held) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      if (Math.abs(dy) > 6 || y < 120 || held) lastY = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onGlide = (e: Event) => {
      if ((e as CustomEvent).detail !== "start") return;
      held = true;
      setHidden(false);
    };
    const SCROLL_KEYS = new Set([
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
    ]);
    const release = (e: Event) => {
      if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return;
      held = false;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(GLIDE_EVENT, onGlide);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(GLIDE_EVENT, onGlide);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // colour: a thin band at the header's centre line; dark if it crosses a data-header="dark" section
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    const inBand = new Set<Element>();
    const setup = () => {
      io?.disconnect();
      inBand.clear();
      const band = 34;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) inBand.add(e.target);
            else inBand.delete(e.target);
          }
          setDark([...inBand].some((el) => el.getAttribute("data-header") === "dark"));
        },
        {
          rootMargin: `-${band}px 0px -${Math.max(0, window.innerHeight - band - 2)}px 0px`,
          threshold: 0,
        },
      );
      document.querySelectorAll("[data-header]").forEach((el) => io!.observe(el));
    };
    setup();
    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(setup, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      io?.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, []);

  // mobile menu: lock the page and make it inert, close on outside tap / Escape / a wide window;
  // focus returns to the toggle when the menu closes from inside it
  useEffect(() => {
    if (!menuOpen) return;
    lockScroll("menu");
    const header = headerRef.current;
    const others = [...(header?.parentElement?.children ?? [])].filter(
      (el) => el !== header,
    ) as HTMLElement[];
    others.forEach((el) => el.setAttribute("inert", ""));
    const close = (refocus: boolean) => {
      setMenuOpen(false);
      if (refocus) toggleRef.current?.focus({ preventScroll: true });
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!header?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      // Tab stays inside the open menu: past the last item it wraps to the toggle (and back)
      if (e.key === "Tab") {
        const items = [...(header?.querySelectorAll<HTMLElement>("#site-menu a") ?? [])];
        const last = items[items.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          toggleRef.current?.focus();
        } else if (e.shiftKey && document.activeElement === toggleRef.current) {
          e.preventDefault();
          last?.focus();
        }
      }
    };
    const wide = window.matchMedia("(min-width: 1280px)");
    const onWide = () => wide.matches && close(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    wide.addEventListener?.("change", onWide);
    return () => {
      others.forEach((el) => el.removeAttribute("inert"));
      unlockScroll("menu");
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener?.("change", onWide);
      // focus must not stay on a link that is now hidden
      if (header?.querySelector("#site-menu")?.contains(document.activeElement))
        toggleRef.current?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const cream = dark || menuOpen;
  const show = !hidden || menuOpen;
  const bar = menuOpen
    ? "bg-[color:var(--stage-deep)] border-[color:var(--cream)]/10"
    : scrolled
      ? cream
        ? "bg-[color:var(--stage-deep)]/72 border-[color:var(--cream)]/10 backdrop-blur-[14px] backdrop-saturate-[1.1]"
        : "bg-[color:var(--cream)]/86 border-[color:var(--ink)]/10 backdrop-blur-[14px] backdrop-saturate-[1.1]"
      : "bg-transparent border-transparent";
  const text = cream ? "text-[color:var(--cream)]" : "text-[color:var(--ink)]";
  const linkCls = `link-wipe whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.18em] opacity-75 transition-opacity duration-200 hover:opacity-100 2xl:text-[11px]`;

  return (
    <header
      ref={headerRef}
      onFocus={(e) => {
        // stay put only for keyboard focus; a mouse click on a nav link must not pin the header
        if (!(e.target as HTMLElement).matches?.(":focus-visible")) return;
        focusInside.current = true;
        setHidden(false);
      }}
      onBlur={() => {
        focusInside.current = false;
      }}
      className={`fixed inset-x-0 top-0 z-50 ${text}`}
      data-tone={cream ? "dark" : "light"}
      style={{
        transform: show ? "none" : "translate3d(0,-100%,0)",
        transition: `transform ${show ? 400 : 500}ms var(--ease-settle), color 400ms var(--ease-settle)`,
        viewTransitionName: "site-header",
      }}
    >
      <div
        className={`border-b transition-[background-color,border-color] duration-[400ms] ease-[cubic-bezier(.165,.84,.44,1)] ${bar}`}
      >
        {/* three columns: the nav is centred on the page, whatever the logo and CTA widths */}
        <div className="site-container grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-6 md:h-[4.5rem]">
          <NavLink
            href={logoHref}
            className="relative col-start-1 flex h-full shrink-0 items-center justify-self-start"
          >
            <span className="sr-only">SVIF, forsíða</span>
            <img
              src={LOGO_INK}
              alt=""
              className="h-6 w-auto object-contain transition-opacity duration-[400ms] md:h-7"
              style={{ opacity: cream ? 0 : 1 }}
            />
            <img
              src={LOGO_CREAM}
              alt=""
              className="absolute left-0 top-1/2 h-6 w-auto -translate-y-1/2 object-contain transition-opacity duration-[400ms] md:h-7"
              style={{ opacity: cream ? 1 : 0 }}
            />
          </NavLink>

          <nav
            aria-label="Aðalvalmynd"
            className="col-start-2 hidden min-w-0 items-center justify-center gap-7 xl:flex 2xl:gap-9"
          >
            {navLinks.map((link) => (
              <NavLink key={link.name} href={link.href} className={linkCls}>
                {link.name}
              </NavLink>
            ))}
          </nav>

          <div className="col-start-3 flex shrink-0 items-center gap-1 justify-self-end">
            <NavLink
              href={cta.href}
              className={`press hidden h-11 min-h-[44px] items-center rounded-full px-5 text-[10.5px] font-medium uppercase tracking-[0.18em] transition-[background-color,border-color,color] duration-200 sm:inline-flex ${
                scrolled || menuOpen
                  ? "bg-[color:var(--rose)] text-[color:var(--ink)] hover:bg-[#c4a48e]"
                  : cream
                    ? "border border-[color:var(--cream)]/40 hover:border-[color:var(--cream)]"
                    : "border border-[color:var(--ink)]/28 hover:border-[color:var(--ink)]/70"
              }`}
            >
              {cta.name}
            </NavLink>
            <button
              ref={toggleRef}
              type="button"
              className="-mr-2 inline-flex h-[44px] w-[44px] items-center justify-center xl:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Loka valmynd" : "Opna valmynd"}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              <span className="relative block h-3 w-6" aria-hidden>
                <span
                  className="absolute left-0 right-0 top-0 h-px bg-current transition-transform duration-[400ms] ease-[cubic-bezier(.165,.84,.44,1)]"
                  style={{ transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none" }}
                />
                <span
                  className="absolute bottom-0 left-0 right-0 h-px bg-current transition-transform duration-[400ms] ease-[cubic-bezier(.165,.84,.44,1)]"
                  style={{ transform: menuOpen ? "translateY(-5px) rotate(-45deg)" : "none" }}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        id="site-menu"
        className="menu-panel absolute inset-x-0 top-full bg-[color:var(--stage-deep)] text-[color:var(--cream)] xl:hidden"
        data-open={menuOpen ? "" : undefined}
        data-lenis-prevent=""
        aria-hidden={!menuOpen}
      >
        <nav
          aria-label="Valmynd"
          className="mx-auto flex max-w-[640px] flex-col px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 short-land:pb-6"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              href={link.href}
              className="flex min-h-[58px] items-center border-b border-[color:var(--cream)]/12 font-[family-name:var(--font-display)] text-[1.15rem] font-light uppercase tracking-[0.12em]"
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
            >
              {link.name}
            </NavLink>
          ))}
          <NavLink
            href={cta.href}
            className="press mt-8 flex h-12 items-center justify-center rounded-full bg-[color:var(--rose)] px-5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink)]"
            onClick={() => setMenuOpen(false)}
            tabIndex={menuOpen ? 0 : -1}
          >
            {cta.name}
          </NavLink>
          <a
            href="tel:8535147"
            className="label-caps mt-4 inline-flex min-h-[44px] items-center justify-center text-center text-[length:max(10.5px,0.62rem)] text-[color:var(--cream)]/72"
            tabIndex={menuOpen ? 0 : -1}
          >
            Sími 853 5147
          </a>
        </nav>
      </div>
    </header>
  );
}
