import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireConsumer, RequireMerchant } from './lib/auth';

// Marketing site
const SiteLayout = lazy(() => import('./site/SiteLayout'));
const HomePage = lazy(() => import('./site/pages/HomePage'));
const RestaurantsPage = lazy(() => import('./site/pages/RestaurantsPage'));
const AboutPage = lazy(() => import('./site/pages/AboutPage'));
const FaqPage = lazy(() => import('./site/pages/FaqPage'));
const TermsPage = lazy(() => import('./site/pages/TermsPage'));
const PrivacyPage = lazy(() => import('./site/pages/PrivacyPage'));

// Consumer app
const AppShell = lazy(() => import('./app/AppShell'));
const LoginPage = lazy(() => import('./app/pages/LoginPage'));
const OnboardingPage = lazy(() => import('./app/pages/OnboardingPage'));
const AppHomePage = lazy(() => import('./app/pages/HomePage'));
const PlacesPage = lazy(() => import('./app/pages/PlacesPage'));
const PlacePage = lazy(() => import('./app/pages/PlacePage'));
const MerchantPage = lazy(() => import('./app/pages/MerchantPage'));
const ProductPage = lazy(() => import('./app/pages/ProductPage'));
const OfferPage = lazy(() => import('./app/pages/OfferPage'));
const CardPage = lazy(() => import('./app/pages/CardPage'));
const HistoryPage = lazy(() => import('./app/pages/HistoryPage'));
const HistoryEntryPage = lazy(() => import('./app/pages/HistoryEntryPage'));
const ProfilePage = lazy(() => import('./app/pages/ProfilePage'));
const SettingsPage = lazy(() => import('./app/pages/SettingsPage'));
const EidPage = lazy(() => import('./app/pages/EidPage'));

// Merchant portal
const MerchantShell = lazy(() => import('./merchant/MerchantShell'));
const MerchantLoginPage = lazy(() => import('./merchant/pages/LoginPage'));
const DashboardPage = lazy(() => import('./merchant/pages/DashboardPage'));
const CreditPage = lazy(() => import('./merchant/pages/CreditPage'));
const ProductsPage = lazy(() => import('./merchant/pages/ProductsPage'));
const CampaignsPage = lazy(() => import('./merchant/pages/CampaignsPage'));
const LocationsPage = lazy(() => import('./merchant/pages/LocationsPage'));
const PosPage = lazy(() => import('./merchant/pages/PosPage'));
const SettlementPage = lazy(() => import('./merchant/pages/SettlementPage'));
const TeamPage = lazy(() => import('./merchant/pages/TeamPage'));
const MerchantSettingsPage = lazy(() => import('./merchant/pages/SettingsPage'));

function Fallback() {
  return <div className="min-h-[60dvh]" aria-busy="true" />;
}

export function VildRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* marketing site */}
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="fyrir-veitingastadi" element={<RestaurantsPage />} />
          <Route path="um-vild" element={<AboutPage />} />
          <Route path="spurningar" element={<FaqPage />} />
          <Route path="skilmalar" element={<TermsPage />} />
          <Route path="personuvernd" element={<PrivacyPage />} />
        </Route>

        {/* consumer app */}
        <Route path="app/innskraning" element={<LoginPage />} />
        <Route path="app/byrja" element={<OnboardingPage />} />
        <Route path="app" element={<RequireConsumer />}>
          <Route element={<AppShell />}>
            <Route index element={<AppHomePage />} />
            <Route path="stadir" element={<PlacesPage />} />
            <Route path="stadir/:id" element={<PlacePage />} />
            <Route path="kedjur/:slug" element={<MerchantPage />} />
            <Route path="vorur/:id" element={<ProductPage />} />
            <Route path="tilbod/:id" element={<OfferPage />} />
            <Route path="kort" element={<CardPage />} />
            <Route path="yfirlit" element={<HistoryPage />} />
            <Route path="yfirlit/:id" element={<HistoryEntryPage />} />
            <Route path="eg" element={<ProfilePage />} />
            <Route path="eg/stillingar" element={<SettingsPage />} />
            <Route path="eg/skilriki" element={<EidPage />} />
          </Route>
        </Route>

        {/* merchant portal */}
        <Route path="fyrirtaeki/innskraning" element={<MerchantLoginPage />} />
        <Route path="fyrirtaeki" element={<RequireMerchant />}>
          <Route element={<MerchantShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="inneign" element={<CreditPage />} />
            <Route path="vorur" element={<ProductsPage />} />
            <Route path="herferdir" element={<CampaignsPage />} />
            <Route path="stadir" element={<LocationsPage />} />
            <Route path="kassakerfi" element={<PosPage />} />
            <Route path="uppgjor" element={<SettlementPage />} />
            <Route path="teymi" element={<TeamPage />} />
            <Route path="stillingar" element={<MerchantSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}
