/**
 * Merchant portal: the pages render with the mock api and every mutation
 * really changes the data layer (checked through api()).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { api } from '../data';
import { href, paths } from '../lib/paths';
import { freshApi, renderAt, signInMerchant } from './setup-helpers';
import LoginPage from '../merchant/pages/LoginPage';
import DashboardPage from '../merchant/pages/DashboardPage';
import CreditPage from '../merchant/pages/CreditPage';
import CampaignsPage from '../merchant/pages/CampaignsPage';
import PosPage from '../merchant/pages/PosPage';
import ProductsPage from '../merchant/pages/ProductsPage';
import SettlementPage from '../merchant/pages/SettlementPage';
import TeamPage from '../merchant/pages/TeamPage';
import LocationsPage from '../merchant/pages/LocationsPage';
import SettingsPage from '../merchant/pages/SettingsPage';
import MerchantShell from '../merchant/MerchantShell';

// recharts measures its container; jsdom has no layout.
beforeEach(() => {
  if (!('ResizeObserver' in globalThis)) {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
  }
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 260 });
});
afterEach(() => {
  vi.useRealTimers();
});

const at = (path: string) => href(path);

describe('merchant login', () => {
  it('signs in with the demo account and lands on the dashboard', async () => {
    freshApi();
    renderAt(at(paths.merchantLogin), '*', null, {
      wrapRoutes: () => (
        <Routes>
          <Route path={at(paths.merchantLogin)} element={<LoginPage />} />
          <Route path={at(paths.merchantDashboard)} element={<h1>Yfirlit (prófun)</h1>} />
        </Routes>
      ),
    });
    expect(await screen.findByText('Innskráning fyrirtækja')).toBeInTheDocument();
    expect(screen.getByText(/Prufuaðgangur/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Netfang'), { target: { value: 'johanna@luna.is' } });
    fireEvent.change(screen.getByLabelText('Lykilorð'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skrá inn' }));
    expect(await screen.findByText('Rangt netfang eða lykilorð.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Lykilorð'), { target: { value: 'luna1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skrá inn' }));
    expect(await screen.findByText('Yfirlit (prófun)')).toBeInTheDocument();
    const session = await api().getSession();
    expect(session?.kind).toBe('merchant');
  });
});

describe('merchant shell', () => {
  it('shows the chain, the nav and the signed-in user', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantCredit), '*', null, {
      wrapRoutes: () => (
        <Routes>
          <Route element={<MerchantShell />}>
            <Route path={at(paths.merchantCredit)} element={<p>Síða</p>} />
          </Route>
        </Routes>
      ),
    });
    expect(await screen.findByText('Lúna')).toBeInTheDocument();
    expect(await screen.findByText('Jóhanna Lúnudóttir')).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Stjórnborð' })[0];
    expect(within(nav).getByRole('link', { name: /Kassakerfi/ })).toHaveAttribute('href', '/vild/fyrirtaeki/kassakerfi');
  });
});

describe('dashboard', () => {
  it('shows the four KPIs and the per-location table', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantDashboard), at(paths.merchantDashboard), <DashboardPage />);
    const stats = await mock.getMerchantStats('m_luna', 30);
    expect(await screen.findByText('Sala')).toBeInTheDocument();
    expect(screen.getByText('Inneign veitt')).toBeInTheDocument();
    expect(screen.getByText('Inneign nýtt')).toBeInTheDocument();
    expect(screen.getByText('61%')).toBeInTheDocument();
    const isk = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`;
    expect(screen.getAllByText(isk(stats.revenue)).length).toBeGreaterThan(0);
    expect(await screen.findByText('Lúna Laugavegi')).toBeInTheDocument();
    // "Inneign veitt" is credit earned on purchases; VILD's welcome credit is a separate line
    expect(stats.welcomeCredit).toBeGreaterThan(0);
    expect(screen.getByText(`Auk þess ${isk(stats.welcomeCredit!)} velkomin inneign sem VILD greiðir`)).toBeInTheDocument();
    expect(screen.getAllByText(isk(stats.creditIssued)).length).toBeGreaterThan(0);
    // "Mest til baka" is ranked by credit and never lists a product that gave nothing
    const top = stats.topProducts.map((t) => t.credit);
    expect(top).toEqual([...top].sort((a, b) => b - a));
    expect(top.every((c) => c > 0)).toBe(true);
    expect(stats.topProducts[0].name).toBe('Margherita');
    expect(screen.getByText('Margherita')).toBeInTheDocument();
    expect(screen.getByText('Kjúklingasalat')).toBeInTheDocument();
    expect(screen.queryByText('Kók 0,33 l')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '7 dagar' }));
    const week = await mock.getMerchantStats('m_luna', 7);
    expect(await screen.findByText(isk(week.revenue))).toBeInTheDocument();
  });
});

describe('credit page', () => {
  it('stepper changes the live example and Vista updates the merchant', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantCredit), at(paths.merchantCredit), <CreditPage />);
    const stepper = await screen.findByRole('group', { name: 'Grunninneign' });
    expect(within(stepper).getByText('10%')).toBeInTheDocument();
    // the example is a product without an exception (Margherita, the salad etc. have their own rules)
    expect(await screen.findByText('+319 kr.')).toBeInTheDocument(); // Beikon ostborgari 3.190 × 10%
    expect(screen.getAllByText('Beikon ostborgari').length).toBeGreaterThan(0);
    fireEvent.click(within(stepper).getByRole('button', { name: 'Auka' }));
    fireEvent.click(within(stepper).getByRole('button', { name: 'Auka' }));
    expect(within(stepper).getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('+383 kr.')).toBeInTheDocument(); // 3.190 × 12% = 382,8
    fireEvent.click(screen.getByRole('button', { name: 'Vista' }));
    await waitFor(async () => expect((await mock.getMerchant('luna'))!.defaultRatePct).toBe(12));
    // the base rule followed, so a product without an exception now earns 12%
    const pep = await mock.getProduct('p_pepperoni');
    expect(pep!.creditPct).toBe(12);
  });

  it('lists exceptions and can switch one off', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantCredit), at(paths.merchantCredit), <CreditPage />);
    expect(await screen.findByText('Vara: Margherita')).toBeInTheDocument();
    expect(screen.getByText('Flokkur: Drykkir')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Margherita · helmingur til baka virk' }));
    await waitFor(async () => expect((await mock.getProduct('p_margherita'))!.creditPct).toBe(10));
  });

  it('adds a product exception through the sheet', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantCredit), at(paths.merchantCredit), <CreditPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Bæta við/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Ný undantekning' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Vara' }));
    fireEvent.click(within(dialog).getByRole('option', { name: /Franskar/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Auka' })); // 10 → 11
    expect(within(dialog).getByDisplayValue('Franskar · 11%')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vista undantekningu' }));
    await waitFor(async () => expect((await mock.getProduct('p_fries'))!.creditPct).toBe(11));
  });
});

describe('campaigns', () => {
  it('creates a lunch campaign from the template that then applies to products', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T12:30:00')); // Friday lunch
    const mock = freshApi();
    await signInMerchant(mock);
    expect((await mock.getProduct('p_fries'))!.creditPct).toBe(10);
    renderAt(at(paths.merchantCampaigns), at(paths.merchantCampaigns), <CampaignsPage />);
    expect(await screen.findByText('Hádegið · pítsur')).toBeInTheDocument();
    expect(screen.getByText('Í gangi núna')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hádegistilboð/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Ný herferð' });
    expect(within(dialog).getByText('30% til baka af allar vörur, virka daga 11–14.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vista herferð' }));
    await waitFor(async () => expect((await mock.getProduct('p_fries'))!.creditPct).toBe(30));
    // the template button and the new card both say it
    await waitFor(() => expect(screen.getAllByText('Hádegistilboð').length).toBe(2));
  });
});

describe('products', () => {
  it('sorts by credit and shows the rule source', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantProducts), at(paths.merchantProducts), <ProductsPage />);
    const rows = await screen.findAllByRole('row');
    expect(within(rows[1]).getByText('Margherita')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Vara 50%')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Leita að vöru'), { target: { value: 'kók' } });
    expect(await screen.findByText('Flokkur 0%')).toBeInTheDocument();
  });
});

describe('kassakerfi', () => {
  it('test connection flips a location to connected', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantPos), at(paths.merchantPos), <PosPage />);
    expect(await screen.findByText('Lúna Akureyri')).toBeInTheDocument();
    // no made-up endpoint or key
    expect(screen.queryByText(/<project>/)).toBeNull();
    expect(screen.getByText('Lykill fæst hjá VILD við tengingu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afrita api-lykill' })).toBeNull();
    expect((await mock.getLocation('l_akureyri'))!.posStatus).toBe('pending');
    const buttons = screen.getAllByRole('button', { name: 'Prófa tengingu' });
    fireEvent.click(buttons[6]); // Akureyri is the 7th place
    await waitFor(async () => expect((await mock.getLocation('l_akureyri'))!.posStatus).toBe('connected'), { timeout: 4000 });
  });

  it('till simulator looks a customer up and charges', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantPos), at(paths.merchantPos), <PosPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fletta upp' }));
    expect(await screen.findByText('Helgi')).toBeInTheDocument();
    const before = (await mock.tillLookup('VILD-DEMO-7F3A'))!.balance;
    expect(before).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Upphæð kaupa'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Staðfesta' }));
    expect(await screen.findByText('Kaup skráð')).toBeInTheDocument();
    const after = (await mock.tillLookup('VILD-DEMO-7F3A'))!.balance;
    const applied = Math.min(before, 5000);
    const earned = Math.round(((5000 - applied) * 10) / 100);
    expect(after).toBe(before - applied + earned);
  });
});

describe('the other pages', () => {
  it('locations: toggles redemption', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantLocations), at(paths.merchantLocations), <LocationsPage />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Inneign virk á Lúna Granda' }));
    await waitFor(async () => expect((await mock.getLocation('l_grandi'))!.acceptsRedemption).toBe(false));
  });
  it('settlement: lists periods with status', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantSettlement), at(paths.merchantSettlement), <SettlementPage />);
    expect((await screen.findAllByText('Greitt')).length).toBeGreaterThan(0);
    // computed from the same days as the dashboard: October so far is part of the last 30 days
    const rows = await mock.getSettlements('m_luna');
    const isk = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`;
    expect(rows.map((r) => r.periodFrom)).toEqual(['2026-10-01', '2026-09-01', '2026-08-01']);
    for (const r of rows) {
      expect(screen.getAllByText(isk(r.creditIssued)).length).toBeGreaterThan(0);
      expect(r.platformFee).toBe(Math.round(r.creditIssued * 0.1));
    }
    const month = await mock.getMerchantStats('m_luna', 23); // 1.–23. október
    expect(rows[0].creditIssued).toBe(month.creditIssued);
    expect(rows[0].creditRedeemed).toBe(month.creditRedeemed);
  });
  it('team: invites a user', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantTeam), at(paths.merchantTeam), <TeamPage />);
    expect(await screen.findByText('Kristján Pétursson')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bjóða notanda' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bjóða notanda' });
    fireEvent.change(within(dialog).getByLabelText('Nafn'), { target: { value: 'Anna Björk' } });
    fireEvent.change(within(dialog).getByLabelText('Netfang'), { target: { value: 'anna@luna.is' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Senda boð' }));
    await waitFor(async () => expect((await mock.getMerchantUsers('m_luna')).some((u) => u.email === 'anna@luna.is')).toBe(true));
    expect(await screen.findByText('Anna Björk')).toBeInTheDocument();
  });
  it('settings: saves the description', async () => {
    const mock = freshApi();
    await signInMerchant(mock);
    renderAt(at(paths.merchantSettings), at(paths.merchantSettings), <SettingsPage />);
    const desc = await screen.findByLabelText('Lýsing');
    expect(screen.getByText('Lúna veitingar ehf.')).toBeInTheDocument();
    fireEvent.change(desc, { target: { value: 'Ný lýsing.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vista' }));
    await waitFor(async () => expect((await mock.getMerchant('luna'))!.description).toBe('Ný lýsing.'));
  });
});
