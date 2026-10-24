import { useEffect, useState } from 'react';
import { AuthProvider } from './lib/auth';
import { IS_MOCK, initApi } from './data';
import { VildRoutes } from './routes';
import './theme.css';

const ROOT_CLASS = 'vild';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Jost:wght@300&display=swap';

/**
 * Puts `.vild` on <body> as well so Radix portals and toasts get the tokens,
 * loads the fonts once, sets the language. Everything is restored on unmount
 * so the CRM is untouched when the user navigates away.
 */
function useModuleChrome() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previousLang = html.lang;
    const previousTitle = document.title;
    body.classList.add(ROOT_CLASS);
    html.classList.add('vild-html');
    html.lang = 'is';
    let link = document.querySelector<HTMLLinkElement>('link[data-vild-fonts]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      link.dataset.vildFonts = '1';
      document.head.appendChild(link);
    }
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewport = viewport?.content ?? null;
    if (viewport) viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const createdTheme = !theme;
    if (!theme) {
      theme = document.createElement('meta');
      theme.name = 'theme-color';
      document.head.appendChild(theme);
    }
    const previousTheme = theme.content;
    theme.content = '#ffffff';
    return () => {
      body.classList.remove(ROOT_CLASS);
      html.classList.remove('vild-html');
      html.lang = previousLang;
      document.title = previousTitle;
      if (viewport && previousViewport != null) viewport.content = previousViewport;
      if (createdTheme) theme?.remove();
      else if (theme) theme.content = previousTheme;
    };
  }, []);
}

/** VILD root. Mounted lazily by src/App.tsx at `/vild/*` (react-query, tooltips and toasts come from there). */
export default function VildApp() {
  useModuleChrome();
  // VITE_VILD_DATA=supabase loads the adapter lazily; the mock is ready synchronously.
  const [apiReady, setApiReady] = useState(IS_MOCK);
  useEffect(() => {
    if (!IS_MOCK) void initApi().then(() => setApiReady(true));
  }, []);
  if (!apiReady) return <div className="vild min-h-screen bg-background" aria-busy="true" />;
  return (
    <div className="vild min-h-screen bg-background text-foreground">
      <AuthProvider>
        <VildRoutes />
      </AuthProvider>
    </div>
  );
}
