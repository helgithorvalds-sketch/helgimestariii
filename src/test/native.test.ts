import { describe, expect, it } from 'vitest';
import { appPathFromUrl } from '../lib/native';
import { isNativeApp } from '../lib/platform';

describe('phone-app glue', () => {
  it('is off on the website', () => {
    expect(isNativeApp()).toBe(false);
  });

  it('maps app links and website links to in-app paths', () => {
    expect(appPathFromUrl('is.midatorg.app://app/eg?eid=ok')).toBe('/eg?eid=ok');
    expect(appPathFromUrl('https://midatorg.lovable.app/vidburdir/abc')).toBe('/vidburdir/abc');
    expect(appPathFromUrl('https://midatorg.lovable.app/midatorg/vidskipti/1')).toBe('/vidskipti/1');
    expect(appPathFromUrl('https://evil.example/vidburdir/abc')).toBeNull();
    expect(appPathFromUrl('not a url')).toBeNull();
  });
});
