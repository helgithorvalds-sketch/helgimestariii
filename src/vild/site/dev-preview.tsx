// TEMPORARY: site-only preview for the screenshot pass while sibling areas are unfinished. Deleted after.
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '../lib/auth';
import '@/index.css';
import '../theme.css';

const SiteLayout = lazy(() => import('./SiteLayout'));
const HomePage = lazy(() => import('./pages/HomePage'));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Jost:wght@300&display=swap';
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = FONT_HREF;
document.head.appendChild(link);
document.body.classList.add('vild');
document.documentElement.classList.add('vild-html');

const start = new URLSearchParams(window.location.search).get('path') ?? '/vild';
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[start]}>
          <div className="vild min-h-screen bg-background text-foreground">
            <AuthProvider>
              <Suspense fallback={<div className="min-h-[60dvh]" aria-busy="true" />}>
                <Routes>
                  <Route path="/vild" element={<SiteLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="fyrir-veitingastadi" element={<RestaurantsPage />} />
                    <Route path="um-vild" element={<AboutPage />} />
                    <Route path="spurningar" element={<FaqPage />} />
                    <Route path="skilmalar" element={<TermsPage />} />
                    <Route path="personuvernd" element={<PrivacyPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </AuthProvider>
          </div>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
