import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import {
  startSmoothScroll,
  stopSmoothScroll,
  scrollToTarget,
  haltInertia,
  releaseAllLocks,
} from "../lib/scroll";
import { markRevealReady } from "../components/motion/reveal-observer";

/* Runs before first paint: reveal states are only hidden when JS is present (research §3.0). */
const JS_GATE = "document.documentElement.classList.add('js')";

function NotFoundComponent() {
  useEffect(() => {
    document.title = "Síðan fannst ekki · SVIF";
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div id="efni" tabIndex={-1} data-focus-target="" className="max-w-md text-center">
        <h1 className="text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl text-foreground">Síðan fannst ekki</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Síðan sem þú leitaðir að er ekki til eða hefur verið færð.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[color:var(--rose)] px-6 text-[11.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink)] transition-colors duration-200 hover:bg-[#c4a48e]"
          >
            Á forsíðu
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div id="efni" tabIndex={-1} data-focus-target="" className="max-w-md text-center">
        <h1 className="text-xl tracking-tight text-foreground">Síðan hlóðst ekki</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Eitthvað fór úrskeiðis hjá okkur. Prófaðu að endurhlaða eða fara á forsíðuna.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reyna aftur
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Á forsíðu
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // default; every route sets its own
      { title: "SVIF" },
      { name: "author", content: "Svif" },
      { name: "theme-color", content: "#f6f5ec" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="is" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: JS_GATE }} />
        <HeadContent />
      </head>
      <body>
        <a
          href="#efni"
          className="sr-only z-[60] rounded-full bg-[color:var(--cream)] px-5 py-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Fara í efni
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Same-page anchors glide with Lenis (offset −80, 1.4 s, glide) instead of jumping. */
function useAnchorGlide() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.includes("#")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname)
        return;
      const hash = decodeURIComponent(url.hash.slice(1));
      // #top goes to the page top; the skip link's #efni is each page's content start (the hero copy,
      // or the H1's block), so it also works before hydration and without JS
      const target = hash === "" || hash === "top" ? 0 : document.getElementById(hash);
      if (target === null) return;
      e.preventDefault();
      // a mouse click must not leave focus on the link (the header would stay pinned while reading);
      // focus moves to the target section when the glide ends
      if (e.detail > 0) a.blur();
      // The URL is left as it is: TanStack's history patches replaceState, and a hash change would
      // make the router jump to the target natively in the middle of the glide.
      if (hash === "efni" && target instanceof HTMLElement) {
        // the skip link: the content start is usually on screen already; then only focus moves
        const r = target.getBoundingClientRect();
        if (r.top >= 0 && r.top < window.innerHeight * 0.6) {
          target.focus({ preventScroll: true });
          return;
        }
      }
      scrollToTarget(target, { immediate: hash === "efni" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const router = useRouter();
  useEffect(() => {
    markRevealReady();
    void startSmoothScroll();
    return () => stopSmoothScroll();
  }, []);
  useEffect(
    () =>
      router.subscribe("onBeforeNavigate", () => {
        // nothing from the previous page (an open film, the menu) may keep the next one frozen
        releaseAllLocks();
        haltInertia();
      }),
    [router],
  );
  useAnchorGlide();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
