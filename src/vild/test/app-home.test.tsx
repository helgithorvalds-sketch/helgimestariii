import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import HomePage from '../app/pages/HomePage';
import { formatISK } from '../lib/format';
import { freshApi, renderAt, signInConsumer } from './setup-helpers';

describe('HomePage', () => {
  beforeEach(() => localStorage.clear());

  it('greets by first name and shows the balance and product cards', async () => {
    const api = freshApi();
    await signInConsumer(api);
    const pockets = await api.getPockets();
    renderAt('/vild/app', '/vild/app', <HomePage />);

    await screen.findByRole('heading', { level: 1, name: 'Hæ Helgi' });
    const card = await screen.findByRole('region', { name: 'Inneignin þín' });
    // AnimatedNumber exposes the final value through aria-label
    await within(card).findByLabelText(formatISK(pockets[0].balance));
    expect(within(card).getByText(/Safnað frá upphafi/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Hádegið/ })).toHaveAttribute('href', '/vild/app/kedjur/luna');

    // product carousel: Margherita gives +1.495 kr.
    const margherita = await screen.findByRole('link', { name: 'Margherita, 2.990 kr., +1.495 kr. til baka' });
    expect(margherita).toHaveAttribute('href', '/vild/app/vorur/p_margherita');
    expect(margherita).toHaveTextContent('+1.495 kr.');
    // the how-it-works card can be dismissed and stays dismissed
    expect(screen.getByText('Svona virkar VILD')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Loka' }).click();
    expect(localStorage.getItem('vild-howto-dismissed')).toBe('1');
    // offers and the fallback nearest place
    await screen.findByText(/Tvær pítsur/);
    await screen.findByText('Lúna Laugavegi');
    // coming pockets listed without brands
    expect(screen.getByText('Kaffið')).toBeInTheDocument();
    expect(screen.getByText('Bíllinn')).toBeInTheDocument();
  });
});
