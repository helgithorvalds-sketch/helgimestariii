import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { freshApi, renderAt } from './setup-helpers';
import SiteLayout from '../site/SiteLayout';
import HomePage from '../site/pages/HomePage';
import RestaurantsPage from '../site/pages/RestaurantsPage';
import FaqPage from '../site/pages/FaqPage';
import TermsPage from '../site/pages/TermsPage';
import PrivacyPage from '../site/pages/PrivacyPage';
import { groupByCity, project } from '../site/components/iceland-geo';
import { locations } from '../data/seed';

/* jsdom has no IntersectionObserver; framer-motion's whileInView needs one. Everything is "in view". */
beforeAll(() => {
  class IO {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) {
      this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO });
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
});

function site(path: string) {
  return renderAt(
    path,
    '/*',
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="fyrir-veitingastadi" element={<RestaurantsPage />} />
        <Route path="spurningar" element={<FaqPage />} />
        <Route path="skilmalar" element={<TermsPage />} />
        <Route path="personuvernd" element={<PrivacyPage />} />
      </Route>
    </Routes>,
  );
}

beforeEach(() => {
  freshApi();
});

describe('home page', () => {
  it('renders the headline, the facts line and the product cards from the mock', async () => {
    site('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Borgaðu fullt verð. Fáðu hluta til baka.' })).toBeInTheDocument();
    expect(screen.getByText('Gildir í 24 mánuði')).toBeInTheDocument();
    expect(document.title).toBe('VILD – Inneign í stað afsláttar');
    // product cards come from useProducts('m_luna'); Margherita has the highest rate and comes first
    const margherita = await screen.findByRole('link', { name: /Margherita, 2\.990 kr\., \+1\.495 kr\. til baka/ });
    expect(margherita).toHaveAttribute('href', '/vild/app/vorur/p_margherita');
    const cards = screen.getAllByRole('link', { name: /til baka$/ });
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.length).toBeLessThanOrEqual(8);
    // drinks have no credit and must not appear
    expect(screen.queryByRole('link', { name: /Kók/ })).toBeNull();
  });

  it('lists the cities with their counts and places them on the map', async () => {
    site('/');
    const list = await screen.findByRole('list', { name: 'Staðir eftir bæjarfélagi' });
    expect(await within(list).findByText('Reykjavík')).toBeInTheDocument();
    expect(within(list).getByText('4 staðir')).toBeInTheDocument();
    expect(within(list).getAllByText('1 staður').length).toBe(5);
    expect(screen.getByRole('img', { name: 'Kort af Íslandi með 9 stöðum' })).toBeInTheDocument();
  });

  it('has the how-it-works anchor and the six questions', () => {
    site('/');
    expect(document.getElementById('svona-virkar')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Hvað gildir inneignin lengi?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hvað gerist ef ég borga með inneign?' })).toBeInTheDocument();
  });

  it('uses afsláttur only in the comparison and has no exclamation marks', () => {
    const { container } = site('/');
    const text = container.textContent ?? '';
    const stripped = text.replace(/Inneign í stað afsláttar|Inneign, ekki afsláttur\.|Afsláttur er króna[^.]*\.|Afslátturinn er gleymdur um leið\.|Afsláttur(?=Gesturinn borgar)/g, '');
    expect(stripped).not.toMatch(/afslátt/i);
    expect(text).not.toMatch(/!/);
  });
});

describe('credit calculator', () => {
  it('recomputes both columns when the sliders move', async () => {
    site('/');
    const calc = screen.getByTestId('credit-calculator');
    const price = within(calc).getByLabelText('Verð máltíðar') as HTMLInputElement;
    const pct = within(calc).getByLabelText('Hlutfall til baka') as HTMLInputElement;
    expect(price.value).toBe('3000');
    expect(pct.value).toBe('50');
    // defaults: 3.000 kr. at 50 % → guest pays 1.500 with a discount, gets 1.500 back as credit
    expect(within(calc).getAllByLabelText('1.500 kr.').length).toBe(3);

    fireEvent.change(price, { target: { value: '6000' } });
    fireEvent.change(pct, { target: { value: '20' } });
    await waitFor(() => {
      expect(within(calc).getByText('6.000 kr.')).toBeInTheDocument(); // the output
    });
    // discount: pays 4.800, loses 1.200 · credit: pays 6.000, gets 1.200 back
    expect(within(calc).getAllByLabelText('1.200 kr.').length).toBe(2);
    expect(within(calc).getByLabelText('4.800 kr.')).toBeInTheDocument();
    expect(within(calc).getByLabelText('6.000 kr.')).toBeInTheDocument();
  });

  it('merchant mode shows what credit costs at cost-of-goods', () => {
    site('/fyrir-veitingastadi');
    const calc = screen.getByTestId('credit-calculator');
    const cogs = within(calc).getByLabelText('Hráefni, hlutfall af verði') as HTMLInputElement;
    expect(cogs.value).toBe('30');
    expect(within(calc).getByLabelText('300 kr.')).toBeInTheDocument();
    fireEvent.change(cogs, { target: { value: '50' } });
    expect(within(calc).getByLabelText('500 kr.')).toBeInTheDocument();
  });
});

describe('restaurants page', () => {
  it('validates the contact form and shows the success state in place', async () => {
    site('/fyrir-veitingastadi');
    expect(screen.getByRole('heading', { level: 1, name: 'Ein keðja í hverjum geira. Þín?' })).toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'Hafa samband' });
    fireEvent.click(within(form).getByRole('button', { name: 'Senda' }));
    expect(within(form).getByText('Vantar nafn.')).toBeInTheDocument();
    expect(within(form).getByText('Netfangið lítur ekki rétt út.')).toBeInTheDocument();

    fireEvent.change(within(form).getByLabelText('Nafn'), { target: { value: 'Jóhanna' } });
    fireEvent.change(within(form).getByLabelText('Fyrirtæki'), { target: { value: 'Lúna' } });
    fireEvent.change(within(form).getByLabelText('Netfang'), { target: { value: 'johanna@luna.is' } });
    fireEvent.change(within(form).getByLabelText('Sími'), { target: { value: '555 0100' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Senda' }));

    expect(await screen.findByText('Takk. Við heyrum í þér innan tveggja virkra daga.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Hafa samband' })).toBeNull();
  });

  it('steps the credit picker and updates the example', () => {
    site('/fyrir-veitingastadi');
    expect(screen.getByText('10%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hækka prósentu' }));
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('+449 kr.')).toBeInTheDocument(); // 15 % of 2.990
    for (const l of screen.getAllByRole('link', { name: 'Innskráning fyrirtækja' })) expect(l).toHaveAttribute('href', '/vild/fyrirtaeki/innskraning');
  });
});

describe('faq, terms and privacy', () => {
  it('renders the grouped questions with anchors', () => {
    site('/spurningar');
    expect(screen.getByRole('heading', { level: 1, name: /svör\. Stutt og skýr\./ })).toBeInTheDocument();
    for (const id of ['appid', 'inneignin', 'rafraen-skilriki', 'fyrir-veitingastadi']) expect(document.getElementById(id)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Þarf ég rafræn skilríki?' })).toBeInTheDocument();
    expect(document.title).toBe('Spurningar – VILD');
  });

  it('terms and privacy are marked as drafts and state the 24 months', () => {
    site('/skilmalar');
    expect(screen.getByText('Drög – ekki yfirfarið af lögfræðingi.')).toBeInTheDocument();
    expect(screen.getByText(/24 mánuði frá þeim degi/)).toBeInTheDocument();
    site('/personuvernd');
    expect(screen.getAllByText('Drög – ekki yfirfarið af lögfræðingi.').length).toBe(2);
    expect(screen.getAllByText(/Kennitalan er notuð einu sinni/).length).toBeGreaterThan(0);
  });
});

describe('layout', () => {
  it('header and footer link to the right places', () => {
    site('/spurningar');
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Sækja appið' })).toHaveAttribute('href', '/vild/app');
    expect(within(header).getByRole('link', { name: 'Innskráning fyrirtækja' })).toHaveAttribute('href', '/vild/fyrirtaeki/innskraning');
    expect(within(header).getByRole('link', { name: 'Svona virkar VILD' })).toHaveAttribute('href', '/vild#svona-virkar');
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Skilmálar' })).toHaveAttribute('href', '/vild/skilmalar');
    expect(within(footer).getByRole('link', { name: 'App Store' })).toHaveAttribute('title', 'Væntanlegt í App Store');
    expect(within(footer).getByText('© 2026 VILD')).toBeInTheDocument();
  });

  it('mobile menu opens and lists the links', () => {
    site('/');
    fireEvent.click(screen.getByRole('button', { name: 'Opna valmynd' }));
    const menu = document.getElementById('site-menu')!;
    expect(within(menu).getByRole('link', { name: 'Fyrir veitingastaði' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Loka valmynd' }));
  });
});

describe('map projection', () => {
  it('puts Akureyri north of Reykjavík and Reykjanesbær south-west of it', () => {
    const g = Object.fromEntries(groupByCity(locations).map((x) => [x.city, x]));
    const rvk = project(g['Reykjavík'].lat, g['Reykjavík'].lng);
    const ak = project(g['Akureyri'].lat, g['Akureyri'].lng);
    const kef = project(g['Reykjanesbær'].lat, g['Reykjanesbær'].lng);
    expect(ak.y).toBeLessThan(rvk.y);
    expect(ak.x).toBeGreaterThan(rvk.x);
    expect(kef.y).toBeGreaterThan(rvk.y);
    expect(kef.x).toBeLessThan(rvk.x);
    expect(g['Reykjavík'].count).toBe(4);
  });
});
