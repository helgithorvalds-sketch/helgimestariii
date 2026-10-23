/**
 * Demo data for VILD. Everything the mock data layer serves comes from here,
 * and the Supabase seed (supabase-vild/seed/seed.sql) mirrors it.
 *
 * The partner chain is fictional ("Lúna"): a restaurant group with pizza,
 * burgers and salads in nine places around Iceland. Other sectors are listed
 * as coming soon, without naming anyone.
 */
import type { Location, Merchant, MerchantStats, MerchantUser, Offer, Product, RewardRule, Sector, Settlement } from '../lib/types';

export const DEMO_USER_ID = 'u_demo_helgi';
export const DEMO_MERCHANT_ID = 'm_luna';

export const sectors: Sector[] = [
  { slug: 'veitingar', name: 'Veitingastaðir', pocketName: 'Hádegið', tagline: 'Pítsur, borgarar og salöt', status: 'live', icon: 'utensils' },
  { slug: 'kaffi', name: 'Kaffihús', pocketName: 'Kaffið', tagline: 'Væntanlegt', status: 'coming', icon: 'coffee' },
  { slug: 'eldsneyti', name: 'Eldsneyti', pocketName: 'Bíllinn', tagline: 'Væntanlegt', status: 'coming', icon: 'fuel' },
  { slug: 'fagvorur', name: 'Fagvörur', pocketName: 'Vinnan', tagline: 'Væntanlegt', status: 'coming', icon: 'hammer' },
  { slug: 'likamsraekt', name: 'Líkamsrækt', pocketName: 'Hreyfingin', tagline: 'Væntanlegt', status: 'coming', icon: 'dumbbell' },
];

export const merchants: Merchant[] = [
  {
    id: DEMO_MERCHANT_ID,
    slug: 'luna',
    sector: 'veitingar',
    name: 'Lúna',
    legalName: 'Lúna veitingar ehf.',
    description: 'Eldbakaðar pítsur, borgarar á súrdeigsbrauði og fersk salöt. Níu staðir um allt land.',
    logoText: 'L',
    brandColor: '#1F2A44',
    heroImage: '/vild/img/hero-luna.jpg',
    defaultRatePct: 10,
    website: 'https://luna.is',
    status: 'active',
  },
];

const L = (
  id: string,
  name: string,
  address: string,
  city: string,
  lat: number,
  lng: number,
  openingHours = '11–22',
  posStatus: Location['posStatus'] = 'connected',
): Location => ({
  id,
  merchantId: DEMO_MERCHANT_ID,
  name,
  address,
  city,
  lat,
  lng,
  openingHours,
  phone: '555 0100',
  acceptsRedemption: true,
  posVendor: 'noona',
  posStatus,
});

export const locations: Location[] = [
  L('l_laugavegur', 'Lúna Laugavegi', 'Laugavegur 45', 'Reykjavík', 64.1447, -21.9275, '11–23'),
  L('l_kringlan', 'Lúna Kringlunni', 'Kringlan 4–12', 'Reykjavík', 64.1297, -21.8936, '10–21'),
  L('l_grandi', 'Lúna Granda', 'Grandagarður 16', 'Reykjavík', 64.1555, -21.9497),
  L('l_spongin', 'Lúna Spönginni', 'Spöngin 11', 'Reykjavík', 64.1431, -21.7843),
  L('l_smaralind', 'Lúna Smáralind', 'Hagasmári 1', 'Kópavogur', 64.1003, -21.8847, '10–21'),
  L('l_fjordur', 'Lúna Firði', 'Fjörður, Fjarðargata 13–15', 'Hafnarfjörður', 64.0674, -21.9541),
  L('l_akureyri', 'Lúna Akureyri', 'Glerártorg', 'Akureyri', 65.6878, -18.1121, '11–22', 'pending'),
  L('l_selfoss', 'Lúna Selfossi', 'Austurvegur 22', 'Selfoss', 63.9387, -21.0012),
  L('l_keflavik', 'Lúna Reykjanesbæ', 'Hafnargata 29', 'Reykjanesbær', 63.9975, -22.5586, '11–22', 'offline'),
];

type P = Omit<Product, 'merchantId' | 'creditAmount' | 'creditPct'> & { creditPct?: number; creditAmount?: number };

const productList: P[] = [
  { id: 'p_margherita', name: 'Margherita', category: 'pizza', price: 2990, image: '/vild/img/products/margherita.jpg', description: 'San Marzano tómatar, fior di latte, basilíka.', featured: true, creditPct: 50 },
  { id: 'p_pepperoni', name: 'Pepperoni', category: 'pizza', price: 3290, image: '/vild/img/products/pepperoni.jpg', description: 'Pepperoni, mozzarella, hunang og chili.', featured: true },
  { id: 'p_sveppa', name: 'Sveppa & trufflu', category: 'pizza', price: 3690, image: '/vild/img/products/sveppa.jpg', description: 'Villisveppir, trufflumajó, parmesan.', featured: false },
  { id: 'p_parma', name: 'Parma & klettasalat', category: 'pizza', price: 3790, image: '/vild/img/products/parma.jpg', description: 'Parmaskinka, klettasalat, burrata.', featured: false },
  { id: 'p_luna_burger', name: 'Lúnuborgari', category: 'burger', price: 2890, image: '/vild/img/products/burger.jpg', description: '150 g nautakjöt, cheddar, Lúnusósa, súrdeigsbrauð.', featured: true, creditPct: 20 },
  { id: 'p_bacon', name: 'Beikon ostborgari', category: 'burger', price: 3190, image: '/vild/img/products/bacon-burger.jpg', description: 'Tvöfaldur ostur, stökkt beikon, karamellulaukur.', featured: false },
  { id: 'p_vegan', name: 'Græni borgarinn', category: 'burger', price: 2790, image: '/vild/img/products/vegan-burger.jpg', description: 'Baunabuff, avókadó, chipotle-majó.', featured: false },
  { id: 'p_chicken_salad', name: 'Kjúklingasalat', category: 'salad', price: 2690, image: '/vild/img/products/chicken-salad.jpg', description: 'Grillaður kjúklingur, kínóa, feta, sítrónudressing.', featured: true, creditPct: 25 },
  { id: 'p_greek', name: 'Grískt salat', category: 'salad', price: 2390, image: '/vild/img/products/greek-salad.jpg', description: 'Feta, ólífur, agúrka, rauðlaukur.', featured: false },
  { id: 'p_fries', name: 'Franskar', category: 'side', price: 890, image: '/vild/img/products/fries.jpg', description: 'Tvísteiktar, sjávarsalt.', featured: false },
  { id: 'p_garlic', name: 'Hvítlauksbrauð', category: 'side', price: 990, image: '/vild/img/products/garlic-bread.jpg', description: 'Með mozzarella.', featured: false },
  { id: 'p_cola', name: 'Kók 0,33 l', category: 'drink', price: 490, image: '/vild/img/products/cola.jpg', description: null, featured: false, creditPct: 0 },
  { id: 'p_soda', name: 'Sódavatn', category: 'drink', price: 390, image: '/vild/img/products/soda.jpg', description: null, featured: false, creditPct: 0 },
  { id: 'p_cake', name: 'Súkkulaðikaka', category: 'dessert', price: 1290, image: '/vild/img/products/cake.jpg', description: 'Volg, með vanilluís.', featured: false, creditPct: 15 },
  { id: 'p_coffee', name: 'Kaffi', category: 'coffee', price: 590, image: '/vild/img/products/coffee.jpg', description: null, featured: false, creditPct: 0 },
];

export const CATEGORY_LABELS: Record<Product['category'], string> = {
  pizza: 'Pítsur',
  burger: 'Borgarar',
  salad: 'Salöt',
  drink: 'Drykkir',
  dessert: 'Eftirréttir',
  side: 'Meðlæti',
  coffee: 'Kaffi',
  other: 'Annað',
};

export const rewardRules: RewardRule[] = [
  { id: 'r_default', merchantId: DEMO_MERCHANT_ID, scope: 'merchant', categoryId: null, productId: null, ratePct: 10, fixedAmount: null, name: 'Grunninneign', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-08-01T09:00:00Z' },
  { id: 'r_drinks', merchantId: DEMO_MERCHANT_ID, scope: 'category', categoryId: 'drink', productId: null, ratePct: 0, fixedAmount: null, name: 'Drykkir undanskildir', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-08-01T09:00:00Z' },
  { id: 'r_coffee', merchantId: DEMO_MERCHANT_ID, scope: 'category', categoryId: 'coffee', productId: null, ratePct: 0, fixedAmount: null, name: 'Kaffi undanskilið', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-08-01T09:00:00Z' },
  { id: 'r_margherita', merchantId: DEMO_MERCHANT_ID, scope: 'product', categoryId: null, productId: 'p_margherita', ratePct: 50, fixedAmount: null, name: 'Margherita · helmingur til baka', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-09-15T09:00:00Z' },
  { id: 'r_burger', merchantId: DEMO_MERCHANT_ID, scope: 'product', categoryId: null, productId: 'p_luna_burger', ratePct: 20, fixedAmount: null, name: 'Lúnuborgari', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-09-15T09:00:00Z' },
  { id: 'r_salad', merchantId: DEMO_MERCHANT_ID, scope: 'product', categoryId: null, productId: 'p_chicken_salad', ratePct: 25, fixedAmount: null, name: 'Kjúklingasalat', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-09-15T09:00:00Z' },
  { id: 'r_dessert', merchantId: DEMO_MERCHANT_ID, scope: 'category', categoryId: 'dessert', productId: null, ratePct: 15, fixedAmount: null, name: 'Eftirréttir', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '2026-09-15T09:00:00Z' },
  { id: 'r_lunch', merchantId: DEMO_MERCHANT_ID, scope: 'category', categoryId: 'pizza', productId: null, ratePct: 30, fixedAmount: null, name: 'Hádegið · pítsur', startsAt: null, endsAt: null, weekdays: [1, 2, 3, 4, 5], hoursFrom: '11:00', hoursTo: '14:00', active: true, createdAt: '2026-10-01T09:00:00Z' },
  { id: 'r_tuesday', merchantId: DEMO_MERCHANT_ID, scope: 'merchant', categoryId: null, productId: null, ratePct: 20, fixedAmount: null, name: 'Þriðjudagar · allt', startsAt: null, endsAt: null, weekdays: [2], hoursFrom: null, hoursTo: null, active: false, createdAt: '2026-10-10T09:00:00Z' },
];

/**
 * The credit for a product right now: the most specific active rule wins
 * (product > category > merchant default). Time-boxed rules only count inside
 * their window. Pure, so it runs in the browser, in tests and (as SQL) in the DB.
 */
export function creditFor(product: Pick<Product, 'id' | 'category' | 'price'>, rules: RewardRule[], at: Date = new Date()): { amount: number; pct: number; rule: RewardRule | null } {
  const inWindow = (r: RewardRule) => {
    if (!r.active) return false;
    if (r.startsAt && new Date(r.startsAt) > at) return false;
    if (r.endsAt && new Date(r.endsAt) < at) return false;
    if (r.weekdays && r.weekdays.length) {
      const wd = ((at.getDay() + 6) % 7) + 1; // Monday = 1
      if (!r.weekdays.includes(wd)) return false;
    }
    if (r.hoursFrom && r.hoursTo) {
      const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
      if (hhmm < r.hoursFrom || hhmm >= r.hoursTo) return false;
    }
    return true;
  };
  const candidates = rules.filter(inWindow);
  const pick = (scope: RewardRule['scope']) =>
    candidates
      .filter((r) => r.scope === scope && (scope === 'product' ? r.productId === product.id : scope === 'category' ? r.categoryId === product.category : true))
      // a time-boxed rule beats an always-on one at the same scope; then the newest
      .sort((a, b) => Number(Boolean(b.weekdays || b.hoursFrom)) - Number(Boolean(a.weekdays || a.hoursFrom)) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const rule = pick('product') ?? pick('category') ?? pick('merchant');
  if (!rule) return { amount: 0, pct: 0, rule: null };
  if (rule.fixedAmount != null) return { amount: Math.min(rule.fixedAmount, product.price), pct: Math.round((rule.fixedAmount / product.price) * 100), rule };
  const pct = rule.ratePct ?? 0;
  return { amount: Math.round((product.price * pct) / 100), pct, rule };
}

/** Products with their credit resolved for a given moment (default: outside the lunch window, so the base rules show). */
export function productsAt(at: Date = new Date('2026-10-23T16:00:00')): Product[] {
  return productList.map((p) => {
    const c = creditFor(p, rewardRules, at);
    return { ...p, merchantId: DEMO_MERCHANT_ID, creditAmount: c.amount, creditPct: c.pct };
  });
}

export const products: Product[] = productsAt();

export const offers: Offer[] = [
  { id: 'o_lunch', merchantId: DEMO_MERCHANT_ID, title: 'Hádegið: 30% til baka af pítsum', body: 'Virka daga 11–14. Borgaðu fullt verð, fáðu 30% í inneign.', image: '/vild/img/products/margherita.jpg', creditAmount: null, creditPct: 30, validUntil: null, productIds: ['p_margherita', 'p_pepperoni', 'p_sveppa', 'p_parma'], tag: 'Hádegi' },
  { id: 'o_margherita', merchantId: DEMO_MERCHANT_ID, title: 'Margherita · helmingurinn til baka', body: '2.990 kr. og 1.495 kr. koma strax inn á Lúnu-inneignina.', image: '/vild/img/products/margherita.jpg', creditAmount: 1495, creditPct: 50, validUntil: '2026-11-30T23:59:00Z', productIds: ['p_margherita'], tag: 'Vinsælt' },
  { id: 'o_two', merchantId: DEMO_MERCHANT_ID, title: 'Tvær pítsur, 1.000 kr. til baka', body: 'Gildir um helgar á öllum stöðum.', image: '/vild/img/products/pepperoni.jpg', creditAmount: 1000, creditPct: null, validUntil: '2026-12-31T23:59:00Z', productIds: ['p_pepperoni', 'p_sveppa', 'p_parma'], tag: 'Helgin' },
  { id: 'o_salad', merchantId: DEMO_MERCHANT_ID, title: 'Kjúklingasalat · 25% til baka', body: 'Fersk og létt. Fjórðungur kemur til baka.', image: '/vild/img/products/chicken-salad.jpg', creditAmount: 672, creditPct: 25, validUntil: null, productIds: ['p_chicken_salad'], tag: 'Nýtt' },
];

export const merchantUsers: MerchantUser[] = [
  { id: 'mu_1', merchantId: DEMO_MERCHANT_ID, name: 'Jóhanna Lúnudóttir', email: 'johanna@luna.is', role: 'owner', locationIds: null },
  { id: 'mu_2', merchantId: DEMO_MERCHANT_ID, name: 'Kristján Pétursson', email: 'kristjan@luna.is', role: 'manager', locationIds: ['l_laugavegur', 'l_grandi'] },
  { id: 'mu_3', merchantId: DEMO_MERCHANT_ID, name: 'Elín Ósk', email: 'elin@luna.is', role: 'staff', locationIds: ['l_akureyri'] },
];

export const settlements: Settlement[] = [
  { id: 's_2026_09', merchantId: DEMO_MERCHANT_ID, periodFrom: '2026-09-01', periodTo: '2026-09-30', creditIssued: 1842500, creditRedeemed: 1203400, platformFee: 184250, status: 'paid' },
  { id: 's_2026_10', merchantId: DEMO_MERCHANT_ID, periodFrom: '2026-10-01', periodTo: '2026-10-31', creditIssued: 1412300, creditRedeemed: 1031900, platformFee: 141230, status: 'open' },
];

/** Deterministic pseudo-random for stable demo charts. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildStats(periodDays = 30, now: Date = new Date('2026-10-23T12:00:00')): MerchantStats {
  const rnd = mulberry32(42);
  const daily: MerchantStats['daily'] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 5 || d.getDay() === 6;
    const purchases = Math.round((weekend ? 420 : 260) * (0.8 + rnd() * 0.4));
    const revenue = Math.round(purchases * (3100 + rnd() * 900));
    const issued = Math.round(revenue * (0.095 + rnd() * 0.03));
    const redeemed = Math.round(issued * (0.55 + rnd() * 0.3));
    daily.push({ date: d.toISOString().slice(0, 10), revenue, issued, redeemed, purchases });
  }
  const sum = (k: keyof MerchantStats['daily'][number]) => daily.reduce((a, x) => a + (x[k] as number), 0);
  const purchases = sum('purchases');
  const revenue = sum('revenue');
  return {
    merchantId: DEMO_MERCHANT_ID,
    periodDays,
    purchases,
    revenue,
    creditIssued: sum('issued'),
    creditRedeemed: sum('redeemed'),
    returningCustomersPct: 61,
    newMembers: 1184,
    avgBasket: Math.round(revenue / purchases),
    daily,
    topProducts: [
      { productId: 'p_margherita', name: 'Margherita', qty: 2140, credit: 2140 * 1495 },
      { productId: 'p_luna_burger', name: 'Lúnuborgari', qty: 1720, credit: 1720 * 578 },
      { productId: 'p_pepperoni', name: 'Pepperoni', qty: 1410, credit: 1410 * 329 },
      { productId: 'p_chicken_salad', name: 'Kjúklingasalat', qty: 980, credit: 980 * 672 },
      { productId: 'p_cake', name: 'Súkkulaðikaka', qty: 640, credit: 640 * 194 },
    ],
    byLocation: locations.map((l, i) => ({ locationId: l.id, name: l.name, purchases: Math.round(purchases * [0.19, 0.17, 0.11, 0.08, 0.15, 0.09, 0.08, 0.07, 0.06][i]), revenue: Math.round(revenue * [0.19, 0.17, 0.11, 0.08, 0.15, 0.09, 0.08, 0.07, 0.06][i]) })),
  };
}
