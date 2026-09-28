import { useEffect } from 'react';
import { I18nProvider } from './lib/i18n';
import { AuthProvider } from './lib/auth';
import { MidatorgRoutes } from './routes';
import { NativeBridge } from './components/layout/NativeBridge';
import './theme.css';

const ROOT_CLASS = 'midatorg';

/**
 * Puts `.midatorg` on <body> as well, so Radix portals (menus, dialogs, selects)
 * and the sonner toaster — which render outside our root div — get the component
 * styles scoped to that class. `<html lang>` follows the locale (I18nProvider).
 */
function useBodyTheme() {
  useEffect(() => {
    document.body.classList.add(ROOT_CLASS);
    return () => document.body.classList.remove(ROOT_CLASS);
  }, []);
}

/** Miðatorg root; QueryClientProvider, the router and the toaster come from App.tsx. */
export default function MidatorgApp() {
  useBodyTheme();
  return (
    <div className="midatorg min-h-screen bg-background text-foreground" style={{ colorScheme: 'light' }}>
      <I18nProvider>
        <AuthProvider>
          <NativeBridge />
          <MidatorgRoutes />
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}
