/**
 * Standalone entry for the VILD app (the build Capacitor wraps for the App
 * Store / Play Store, and a plain web deploy on its own domain). The CRM
 * build mounts the same module at /vild instead (src/App.tsx).
 *
 *   npm run build:vild   → dist-vild/   (VITE_VILD_BASE="" so routes live at /)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as Sonner } from '@/components/ui/sonner';
import VildApp from './VildApp';
import '@/index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<VildApp />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
