// Verkefnastjórnun design spec → video tokens.
// Source of truth: the product's own src/index.css + tailwind.config.ts (light + .dark tokens),
// fonts from index.html (Inter for body, Plus Jakarta Sans for headings).
import { continueRender, delayRender } from 'remotion';
import type { Look } from './fixtures/Look';
import { FONT_FACES } from './fonts-data';

// Fonts are embedded (src/fonts-data.ts) and registered once per tab; frames wait until they are decoded.
if (typeof document !== 'undefined' && !(window as unknown as { __vfFonts?: boolean }).__vfFonts) {
  (window as unknown as { __vfFonts?: boolean }).__vfFonts = true;
  const handle = delayRender('Loading Inter + Plus Jakarta Sans', { timeoutInMilliseconds: 120000, retries: 2 });
  Promise.all(
    FONT_FACES.map((f) => {
      const ff = new FontFace(f.family, `url(${f.data}) format('woff2')`, { style: f.style, weight: f.weight, unicodeRange: f.unicodeRange, display: 'block' });
      document.fonts.add(ff);
      return ff.load();
    }),
  ).then(() => continueRender(handle), (e) => { console.error(e); continueRender(handle); });
}

export const FONTS = {
  sans: 'Inter, system-ui, sans-serif',
  display: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
};

// Light theme (product default)
export const C = {
  bg: '#fafbfd', // --background 215 35% 98.5%
  ink: '#0f1729', // --foreground 222 47% 11%
  muted: '#65758b', // --muted-foreground 215 16% 47%
  border: '#e2e7ee', // --border
  primary: '#2463eb', // --primary 221 83% 53%
  primaryDark: '#3c83f6', // .dark --primary 217 91% 60%
  accent: '#ecf3fe', // --accent 217 91% 96%
  accentFg: '#124bc4', // --accent-foreground
  // stage badges
  email: '#2f79ee',
  registered: '#0da2e7',
  preview: '#f9911a',
  finished: '#24a86a',
  paid: '#1da54f',
  // dark theme (.dark) — used for the "lights off" stage shots
  darkBg: '#090e1a', // .dark --background 222 47% 7%
  darkCard: '#111827',
  darkMuted: '#93a0b4',
};

// The demos' graphite theatre, re-skinned with the product's own dark-mode tokens (navy, not warm black)
export const NAVY: Look = {
  name: 'midnight', dark: true, bg: ['#0e1527', '#090e1a', '#05080f'], light: '#c9d8f5',
  surface: '#111827', surface2: '#172036', line: 'rgba(160,190,255,0.12)',
  ink: '#f2f5fb', ink2: '#93a0b4', ink3: '#5d6883', accent: '#3c83f6', accent2: '#3c83f6', onAccent: '#ffffff', shadow: '#000208',
};

// Body background of the app: two soft radial washes (primary at top-right, accent at bottom-left)
export const APP_BG = `radial-gradient(1200px 600px at 100% -10%, rgba(36,99,235,0.06), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(236,243,254,0.5), transparent 60%), ${C.bg}`;
