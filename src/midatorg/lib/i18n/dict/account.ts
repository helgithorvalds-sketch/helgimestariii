/**
 * Strings owned by the "account" feature agent (spec §7). Keys are flat and dotted,
 * e.g. 'account.title'. Every key must exist in both `is` and `en`
 * (src/midatorg/test/i18n.test.ts enforces parity).
 */
export default {
  is: {},
  en: {},
} as { is: Record<string, string>; en: Record<string, string> };
