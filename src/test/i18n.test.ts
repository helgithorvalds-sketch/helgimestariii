import { describe, expect, it, vi } from 'vitest';
import { dictionaries, interpolate, messages, translate } from '../lib/i18n';

const placeholders = (s: string) => Array.from(s.matchAll(/\{(\w+)\}/g), (m) => m[1]).sort();

describe('i18n dictionaries', () => {
  for (const [name, dict] of Object.entries(dictionaries)) {
    describe(`dict/${name}`, () => {
      it('has both locales', () => {
        expect(dict).toHaveProperty('is');
        expect(dict).toHaveProperty('en');
      });

      it('has the same keys in is and en', () => {
        const isKeys = Object.keys(dict.is).sort();
        const enKeys = Object.keys(dict.en).sort();
        const missingInEn = isKeys.filter((k) => !(k in dict.en));
        const missingInIs = enKeys.filter((k) => !(k in dict.is));
        expect(missingInEn, `keys missing in en: ${missingInEn.join(', ')}`).toEqual([]);
        expect(missingInIs, `keys missing in is: ${missingInIs.join(', ')}`).toEqual([]);
      });

      it('has no empty strings and matching {placeholders}', () => {
        for (const key of Object.keys(dict.is)) {
          expect(dict.is[key].trim(), `is ${key}`).not.toBe('');
          expect(dict.en[key]?.trim(), `en ${key}`).not.toBe('');
          expect(placeholders(dict.is[key]), `placeholders of ${key}`).toEqual(placeholders(dict.en[key] ?? ''));
        }
      });

      it('uses flat dotted keys', () => {
        for (const key of Object.keys(dict.is)) {
          expect(key, key).toMatch(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/);
        }
      });
    });
  }

  it('does not define the same key in two dictionaries', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [name, dict] of Object.entries(dictionaries)) {
      for (const key of Object.keys(dict.is)) {
        const owner = seen.get(key);
        if (owner) dupes.push(`${key} (${owner} + ${name})`);
        else seen.set(key, name);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('merges every dictionary into messages', () => {
    const total = Object.values(dictionaries).reduce((n, d) => n + Object.keys(d.is).length, 0);
    expect(Object.keys(messages.is)).toHaveLength(total);
    expect(Object.keys(messages.en)).toHaveLength(total);
  });
});

describe('translate', () => {
  it('interpolates {vars}', () => {
    expect(interpolate('Hæ {name}, {n} miðar', { name: 'Helgi', n: 2 })).toBe('Hæ Helgi, 2 miðar');
    expect(interpolate('{a} {b}', { a: 'x' })).toBe('x {b}');
    expect(translate('is', 'notifications.unread', { count: 3 })).toBe('3 ólesnar');
    expect(translate('en', 'notifications.unread', { count: 3 })).toBe('3 unread');
  });

  it('returns the key (and warns) when missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(translate('is', 'nope.missing')).toBe('nope.missing');
    warn.mockRestore();
  });
});
