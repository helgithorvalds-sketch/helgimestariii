import { useEffect } from 'react';
import { I18nProvider } from './lib/i18n';
import { AuthProvider } from './lib/auth';
import { MidatorgRoutes } from './routes';
import { APP_TITLE } from './lib/useDocumentTitle';
import './theme.css';

const ROOT_CLASS = 'midatorg';

/**
 * Puts `.midatorg` on <body> as well, so Radix portals (menus, dialogs,
 * selects, tooltips) and the app-level sonner toaster — which render outside our
 * root div — get the Miðatorg tokens. Restored when the module unmounts.
 * Inter is already loaded by index.html; the module uses no other font.
 */
function useBodyTheme() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previousTitle = document.title;
    const previousLang = html.lang;
    body.classList.add(ROOT_CLASS);
    html.classList.add('midatorg-html');
    html.lang = 'is';
    document.title = APP_TITLE;
    return () => {
      body.classList.remove(ROOT_CLASS);
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
  useBodyTheme();
  return (
    <div className="midatorg min-h-screen bg-background text-foreground" style={{ colorScheme: 'light' }}>
      <I18nProvider>
        <AuthProvider>
          <MidatorgRoutes />
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}
