import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import HistoryPage from '../app/pages/HistoryPage';
import HistoryEntryPage from '../app/pages/HistoryEntryPage';
import { formatISK, formatSignedISK } from '../lib/format';
import { freshApi, renderAt, signInConsumer } from './setup-helpers';

describe('HistoryPage', () => {
  it('groups the ledger by day with +/− chips and the basket total', async () => {
    const api = freshApi();
    await signInConsumer(api);
    const ledger = await api.getLedger();
    renderAt('/vild/app/yfirlit', '/vild/app/yfirlit', <HistoryPage />);

    await screen.findByRole('heading', { level: 1, name: 'Yfirlit' });
    // yesterday's visit is the newest entry
    const yesterday = await screen.findByRole('region', { name: 'Í gær' });
    const rows = within(yesterday).getAllByRole('link');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveAttribute('href', `/vild/app/yfirlit/${ledger[0].id}`);
    expect(rows[0]).toHaveTextContent(formatSignedISK(ledger[0].amount));
    expect(rows[0]).toHaveTextContent(formatISK(ledger[0].purchaseTotal!));
    expect(rows[0]).toHaveTextContent('Lúna Smáralind');
    // a spend line shows as a negative chip somewhere in the list
    const spend = ledger.find((e) => e.kind === 'spend')!;
    expect(screen.getAllByText(formatSignedISK(spend.amount)).length).toBeGreaterThan(0);
    // the welcome credit is its own row
    expect(screen.getByText(/Velkomin í VILD/)).toBeInTheDocument();
    // summary strip
    expect(screen.getByText('Safnað')).toBeInTheDocument();
  });
});

describe('HistoryEntryPage', () => {
  it('renders a receipt with items, totals and the balance after', async () => {
    const api = freshApi();
    await signInConsumer(api);
    const ledger = await api.getLedger();
    const earn = ledger.find((e) => e.kind === 'earn' && e.items && e.items.length > 1)!;
    renderAt(`/vild/app/yfirlit/${earn.id}`, '/vild/app/yfirlit/:id', <HistoryEntryPage />);
    const receipt = await screen.findByRole('article', { name: 'Kvittun' });
    for (const it of earn.items!) expect(within(receipt).getByText(it.name)).toBeInTheDocument();
    expect(within(receipt).getByText('Samtals')).toBeInTheDocument();
    expect(within(receipt).getByText('Inneign eftir')).toBeInTheDocument();
    expect(within(receipt).getByText(formatISK(earn.balanceAfter))).toBeInTheDocument();
    expect(within(receipt).getByText(earn.receiptNo!)).toBeInTheDocument();
  });
});
