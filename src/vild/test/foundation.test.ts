import { describe, expect, it } from 'vitest';
import { formatISK, formatSignedISK, formatNumber, formatPct, maskKennitala, isSingular, formatPhone } from '../lib/format';
import { creditFor, productsAt, rewardRules } from '../data/seed';
import { MockApi } from '../data/mock';
import { href, paths } from '../lib/paths';

describe('format', () => {
  it('groups thousands with a dot and uses kr.', () => {
    expect(formatISK(8900)).toBe('8.900 kr.');
    expect(formatISK(1234567)).toBe('1.234.567 kr.');
    expect(formatISK(0)).toBe('0 kr.');
    expect(formatISK(null)).toBe('—');
  });
  it('signs with a typographic minus', () => {
    expect(formatSignedISK(1500)).toBe('+1.500 kr.');
    expect(formatSignedISK(-800)).toBe('−800 kr.');
  });
  it('decimals use a comma', () => {
    expect(formatNumber(12.5, 1)).toBe('12,5');
    expect(formatPct(12.5)).toBe('12,5%');
    expect(formatPct(10)).toBe('10%');
  });
  it('icelandic singular rule', () => {
    expect(isSingular(1)).toBe(true);
    expect(isSingular(11)).toBe(false);
    expect(isSingular(21)).toBe(true);
  });
  it('masks kennitala and formats phones', () => {
    expect(maskKennitala('0101903019')).toBe('010190-xxxx');
    expect(maskKennitala('12')).toBeNull();
    expect(formatPhone('+3546661234')).toBe('666 1234');
  });
});

describe('credit rules', () => {
  const at = new Date('2026-10-23T16:00:00'); // Friday afternoon
  it('product rule beats category beats merchant default', () => {
    const products = productsAt(at);
    const m = products.find((p) => p.id === 'p_margherita')!;
    expect(m.creditPct).toBe(50);
    expect(m.creditAmount).toBe(1495);
    const pep = products.find((p) => p.id === 'p_pepperoni')!;
    expect(pep.creditPct).toBe(10);
    const cola = products.find((p) => p.id === 'p_cola')!;
    expect(cola.creditAmount).toBe(0);
  });
  it('time-boxed category rule applies inside its window', () => {
    const lunch = new Date('2026-10-23T12:30:00'); // Friday lunch
    const pep = productsAt(lunch).find((p) => p.id === 'p_pepperoni')!;
    expect(pep.creditPct).toBe(30);
    const sat = new Date('2026-10-24T12:30:00'); // Saturday lunch: weekday rule off
    expect(productsAt(sat).find((p) => p.id === 'p_pepperoni')!.creditPct).toBe(10);
  });
  it('fixed amount never exceeds the price', () => {
    const r = creditFor({ id: 'x', category: 'side', price: 500 }, [{ ...rewardRules[0], scope: 'product', productId: 'x', ratePct: null, fixedAmount: 900 }], at);
    expect(r.amount).toBe(500);
  });
});

describe('mock api', () => {
  it('logs in with phone + 123456 and has a positive balance', async () => {
    const api = new MockApi({ persist: false, latency: 0 });
    await api.startPhoneLogin('6661234');
    await expect(api.verifyPhoneLogin('6661234', '000000')).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await api.verifyPhoneLogin('6661234', '123456');
    const pockets = await api.getPockets();
    expect(pockets[0].balance).toBeGreaterThan(0);
    const ledger = await api.getLedger();
    expect(ledger.length).toBeGreaterThan(5);
    expect(ledger[0].balanceAfter).toBe(pockets[0].balance);
  });
  it('records a purchase: spends then earns on the paid part', async () => {
    const api = new MockApi({ persist: false, latency: 0 });
    await api.verifyPhoneLogin('6661234', '123456');
    const before = (await api.getPockets())[0].balance;
    const entries = await api.recordPurchase({ merchantId: 'm_luna', locationId: 'l_laugavegur', items: [{ productId: 'p_margherita', qty: 1 }], useCredit: true });
    const spend = entries.find((e) => e.kind === 'spend')!;
    const earn = entries.find((e) => e.kind === 'earn')!;
    expect(-spend.amount).toBe(Math.min(before, 2990));
    expect(earn.amount).toBeLessThan(1495);
    const after = (await api.getPockets())[0].balance;
    expect(after).toBe(before + spend.amount + earn.amount);
  });
  it('merchant login and rule editing changes product credit', async () => {
    const api = new MockApi({ persist: false, latency: 0 });
    await api.merchantLogin('johanna@luna.is', 'luna1234');
    await api.saveRewardRule({ merchantId: 'm_luna', scope: 'product', productId: 'p_fries', categoryId: null, ratePct: 40, fixedAmount: null, name: 'Franskar', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true });
    const fries = await api.getProduct('p_fries');
    expect(fries!.creditPct).toBe(40);
  });
});

describe('paths', () => {
  it('prefixes with the module base', () => {
    expect(href(paths.appHome)).toBe('/vild/app');
    expect(href('/')).toBe('/vild');
    expect(href(paths.appPlace('l_x'))).toBe('/vild/app/stadir/l_x');
  });
});
