import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatDate,
  formatDateTime,
  formatDelta,
  formatDeltaPct,
  formatISK,
  formatMonthYear,
  formatNumber,
  formatRating,
  formatRelative,
  formatTickets,
  formatTime,
  getFormatLocale,
  priceDelta,
  setFormatLocale,
} from '../lib/format';

describe('formatISK', () => {
  it('uses dot thousands and a "kr." suffix', () => {
    expect(formatISK(8900)).toBe('8.900 kr.');
    expect(formatISK(1234567)).toBe('1.234.567 kr.');
    expect(formatISK(0)).toBe('0 kr.');
    expect(formatISK(999)).toBe('999 kr.');
  });
  it('rounds and handles negatives with a typographic minus', () => {
    expect(formatISK(8899.6)).toBe('8.900 kr.');
    expect(formatISK(-1500)).toBe('−1.500 kr.');
  });
  it('renders a dash for missing values', () => {
    expect(formatISK(null)).toBe('—');
    expect(formatISK(undefined)).toBe('—');
    expect(formatISK(Number.NaN)).toBe('—');
  });
});

describe('formatNumber / formatRating', () => {
  it('formats decimals with a comma in Icelandic and a dot in English', () => {
    expect(formatNumber(4.87, 'is', 1)).toBe('4,9');
    expect(formatNumber(4.87, 'en', 1)).toBe('4.9');
    expect(formatNumber(12345, 'en')).toBe('12,345');
    expect(formatRating(4.87, 'is')).toBe('4,9');
    expect(formatRating(null)).toBe('—');
  });
});

describe('dates', () => {
  const nov14 = '2025-11-14T20:00:00';
  it('formatDate: Icelandic weekday + day + month abbreviations', () => {
    expect(formatDate(nov14, 'is')).toBe('fös. 14. nóv.');
    expect(formatDate('2025-09-13T20:00:00', 'is')).toBe('lau. 13. sept.');
  });
  it('formatDate: English', () => {
    expect(formatDate(nov14, 'en')).toBe('Fri 14 Nov');
  });
  it('formatDateTime uses a middle dot before the time', () => {
    expect(formatDateTime(nov14, 'is')).toBe('fös. 14. nóv. · 20:00');
    expect(formatDateTime(nov14, 'en')).toBe('Fri 14 Nov · 20:00');
    expect(formatTime(nov14)).toBe('20:00');
  });
  it('formatMonthYear', () => {
    expect(formatMonthYear('2026-01-05T10:00:00', 'is')).toBe('jan. 2026');
    expect(formatMonthYear('2026-01-05T10:00:00', 'en')).toBe('Jan 2026');
  });
  it('falls back to a dash for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });
  it('follows the current locale set by setFormatLocale', () => {
    setFormatLocale('en');
    expect(getFormatLocale()).toBe('en');
    expect(formatDate(nov14)).toBe('Fri 14 Nov');
    setFormatLocale('is');
    expect(formatDate(nov14)).toBe('fös. 14. nóv.');
  });
});

describe('formatRelative', () => {
  const now = new Date('2025-11-10T12:00:00');
  const at = (ms: number) => new Date(now.getTime() + ms);
  it('Icelandic: eftir / fyrir with correct declension', () => {
    expect(formatRelative(at(3 * 86400e3), 'is', now)).toBe('eftir 3 daga');
    expect(formatRelative(at(1 * 86400e3), 'is', now)).toBe('eftir 1 dag');
    expect(formatRelative(at(-2 * 3600e3), 'is', now)).toBe('fyrir 2 klst.');
    expect(formatRelative(at(-1 * 86400e3), 'is', now)).toBe('fyrir 1 degi');
    expect(formatRelative(at(-3 * 86400e3), 'is', now)).toBe('fyrir 3 dögum');
    expect(formatRelative(at(-5 * 60e3), 'is', now)).toBe('fyrir 5 mínútum');
    expect(formatRelative(at(5 * 60e3), 'is', now)).toBe('eftir 5 mínútur');
    expect(formatRelative(at(14 * 86400e3), 'is', now)).toBe('eftir 2 vikur');
    expect(formatRelative(at(-90 * 86400e3), 'is', now)).toBe('fyrir 3 mánuðum');
    expect(formatRelative(at(30e3), 'is', now)).toBe('rétt í þessu');
  });
  it('English', () => {
    expect(formatRelative(at(3 * 86400e3), 'en', now)).toBe('in 3 days');
    expect(formatRelative(at(-2 * 3600e3), 'en', now)).toBe('2 hours ago');
    expect(formatRelative(at(-1 * 3600e3), 'en', now)).toBe('1 hour ago');
    expect(formatRelative(at(20e3), 'en', now)).toBe('just now');
  });
});

describe('formatCountdown', () => {
  it('renders mm:ss and clamps at zero', () => {
    expect(formatCountdown(24 * 60e3 + 59e3)).toBe('24:59');
    expect(formatCountdown(5e3)).toBe('00:05');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-1000)).toBe('00:00');
    expect(formatCountdown(90 * 60e3)).toBe('90:00');
  });
});

describe('priceDelta / formatDelta', () => {
  it('below face value', () => {
    expect(priceDelta(8010, 8900)).toEqual({ pct: -10, kind: 'below' });
    expect(formatDelta(8010, 8900, 'is')).toBe('−10% undir miðaverði');
    expect(formatDelta(8010, 8900, 'en')).toBe('−10% below face value');
    expect(formatDeltaPct(8010, 8900)).toBe('−10%');
  });
  it('at face value', () => {
    expect(priceDelta(8900, 8900)).toEqual({ pct: 0, kind: 'at' });
    expect(formatDelta(8900, 8900, 'is')).toBe('á miðaverði');
    expect(formatDelta(8900, 8900, 'en')).toBe('at face value');
    expect(formatDeltaPct(8900, 8900)).toBe('±0%');
  });
  it('above face value (admin only)', () => {
    expect(priceDelta(9345, 8900)).toEqual({ pct: 5, kind: 'above' });
    expect(formatDelta(9345, 8900, 'is')).toBe('+5% yfir miðaverði');
  });
  it('rounds and treats a sub-percent difference as "at"', () => {
    expect(priceDelta(8880, 8900)).toEqual({ pct: 0, kind: 'at' });
    expect(priceDelta(7387, 8900).pct).toBe(-17);
  });
  it('is safe with missing face value', () => {
    expect(priceDelta(8000, null)).toEqual({ pct: 0, kind: 'at' });
    expect(priceDelta(8000, 0)).toEqual({ pct: 0, kind: 'at' });
  });
});

describe('formatTickets', () => {
  it('declines correctly', () => {
    expect(formatTickets(1, 'is')).toBe('1 miði');
    expect(formatTickets(2, 'is')).toBe('2 miðar');
    expect(formatTickets(21, 'is')).toBe('21 miði');
    expect(formatTickets(1, 'en')).toBe('1 ticket');
    expect(formatTickets(3, 'en')).toBe('3 tickets');
  });
});
