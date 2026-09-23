import { useEffect } from 'react';
import { I18nProvider } from './lib/i18n';
import { AuthProvider } from './lib/auth';
import { MidatorgRoutes } from './routes';
import { APP_TITLE } from './lib/useDocumentTitle';
import './theme.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
const FONT_LINK_ID = 'midatorg-fonts';
const ROOT_CLASSES = ['midatorg', 'dark'];

/** Adds the DESIGN.md fonts once (Inter is already loaded by index.html; JetBrains Mono is not). */
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

/**
 * Puts `.midatorg.dark` on <body> as well, so Radix portals (menus, dialogs,
 * selects, tooltips) and the app-level sonner toaster — which render outside our
 * root div — get the Miðatorg tokens. Restored when the module unmounts.
 */
function useBodyTheme() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previousTitle = document.title;
    const previousLang = html.lang;
    body.classList.add(...ROOT_CLASSES);
    html.classList.add('midatorg-html');
    html.lang = 'is';
    document.title = APP_TITLE;
    return () => {
      body.classList.remove(...ROOT_CLASSES);
      html.classList.remove('midatorg-html');
      html.lang = previousLang;
      document.title = previousTitle;
    };
  }, []);
}

/**
 * Miðatorg root. Mounted lazily by src/App.tsx at `/midatorg/*`; react-query's
 * QueryClientProvider, TooltipProvider and the sonner Toaster come from App.tsx.
 */
export default function MidatorgApp() {
  useFonts();
  useBodyTheme();
  return (
    <div className="midatorg dark min-h-screen bg-background text-foreground" style={{ colorScheme: 'dark' }}>
      <I18nProvider>
        <AuthProvider>
          <MidatorgRoutes />
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}
