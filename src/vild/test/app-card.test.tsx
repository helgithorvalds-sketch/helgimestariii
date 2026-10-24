import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import CardPage from '../app/pages/CardPage';
import { formatISK } from '../lib/format';
import { freshApi, renderAt, signInConsumer } from './setup-helpers';

describe('CardPage', () => {
  it('renders the wallet card, a QR code and runs a demo purchase that updates the balance', async () => {
    const api = freshApi();
    await signInConsumer(api);
    const before = (await api.getPockets())[0].balance;
    renderAt('/vild/app/kort', '/vild/app/kort', <CardPage />);

    await screen.findByRole('img', { name: /VILD kort, Helgi/ });
    const qr = await screen.findByTestId('wallet-qr');
    await waitFor(() => expect(qr.querySelector('svg')).not.toBeNull());
    expect(screen.getByText('Sýndu kóðann við kassann')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Nota inneign við næstu kaup/ })).toBeChecked();
    // wallet buttons open an explanation sheet, never a disabled state
    fireEvent.click(screen.getByRole('button', { name: /Apple Wallet/ }));
    await screen.findByText(/Kortið fer í veskið í símanum/);
    fireEvent.click(screen.getByRole('button', { name: 'Skilið' }));

    // demo purchase: Margherita ×1 with credit applied
    fireEvent.click(screen.getByRole('button', { name: 'Prófa kaup' }));
    const dialog = await screen.findByRole('dialog', { name: 'Prófa kaup' });
    await within(dialog).findByText(/Þú borgar/);
    fireEvent.click(within(dialog).getByRole('button', { name: /Staðfesta kaup/ }));
    const done = await screen.findByRole('dialog', { name: 'Kaup skráð' });
    expect(within(done).getByText(/komu inn á Hádegið/)).toBeInTheDocument();

    const after = (await api.getPockets())[0].balance;
    expect(after).not.toBe(before);
    const ledger = await api.getLedger({ limit: 2 });
    const earn = ledger.find((e) => e.kind === 'earn')!;
    expect(earn.description).toBe('Margherita');
    await within(done).findByLabelText(formatISK(after));
  });
});
