/**
 * VILD domain types. One source of truth for the mock data layer, the
 * Supabase data layer and the UI. Money is always whole ISK (integers).
 */

export type SectorSlug = 'veitingar' | 'eldsneyti' | 'fagvorur' | 'likamsraekt' | 'kaffi';

/** A sector ("geiri"). Exactly one partner chain per sector; credit is spendable only inside its sector. */
export type Sector = {
  slug: SectorSlug;
  name: string;            // "Veitingastaðir"
  pocketName: string;      // the friendly pocket name shown in the wallet: "Hádegið"
  tagline: string;         // one line under the pocket
  status: 'live' | 'coming';
  icon: 'utensils' | 'fuel' | 'hammer' | 'dumbbell' | 'coffee';
};

export type Merchant = {
  id: string;
  slug: string;
  sector: SectorSlug;
  name: string;            // "Lúna"
  legalName: string;
  description: string;
  logoText: string;        // 1–2 letters for the placeholder mark
  brandColor: string;      // hex, used for the chain card / pin ring
  heroImage: string | null;
  defaultRatePct: number;  // chain-wide credit rate (e.g. 5)
  website: string | null;
  status: 'active' | 'coming';
};

export type Location = {
  id: string;
  merchantId: string;
  name: string;            // "Lúna Laugavegi"
  address: string;
  city: string;
  lat: number;
  lng: number;
  openingHours: string;    // "11–22"
  phone: string | null;
  acceptsRedemption: boolean;
  posVendor: PosVendor | null;
  posStatus: 'connected' | 'pending' | 'offline';
};

export type ProductCategory = 'pizza' | 'burger' | 'salad' | 'drink' | 'dessert' | 'side' | 'coffee' | 'other';

export type Product = {
  id: string;
  merchantId: string;
  name: string;
  category: ProductCategory;
  price: number;           // ISK, full price
  image: string;           // local placeholder path or https url
  description: string | null;
  /** The credit a customer gets for buying it at full price. Derived from the active reward rule. */
  creditAmount: number;
  creditPct: number;
  featured: boolean;
};

export type RewardRuleScope = 'merchant' | 'category' | 'product';

export type RewardRule = {
  id: string;
  merchantId: string;
  scope: RewardRuleScope;
  categoryId: ProductCategory | null;
  productId: string | null;
  ratePct: number | null;        // either a percentage…
  fixedAmount: number | null;    // …or a fixed ISK credit
  name: string;                  // "Hádegistilboð"
  startsAt: string | null;       // ISO; null = always
  endsAt: string | null;
  weekdays: number[] | null;     // 1 = Monday … 7 = Sunday; null = every day
  hoursFrom: string | null;      // "11:00"
  hoursTo: string | null;
  active: boolean;
  createdAt: string;
};

export type Offer = {
  id: string;
  merchantId: string;
  title: string;           // "Tvær pítsur, 1.000 kr. til baka"
  body: string;
  image: string;
  creditAmount: number | null;
  creditPct: number | null;
  validUntil: string | null;
  productIds: string[];
  tag: string | null;      // "Hádegi", "Nýtt", "Helgin"
};

export type LedgerKind = 'earn' | 'spend' | 'adjust' | 'expire' | 'welcome';

export type LedgerEntry = {
  id: string;
  userId: string;
  merchantId: string;
  locationId: string | null;
  kind: LedgerKind;
  amount: number;          // positive for earn/welcome/adjust+, negative for spend/expire
  purchaseTotal: number | null;
  description: string;     // "Margherita + Kók"
  items: { name: string; qty: number; price: number; credit: number }[] | null;
  createdAt: string;
  receiptNo: string | null;
  balanceAfter: number;
};

export type Pocket = {
  merchantId: string;
  sector: SectorSlug;
  balance: number;
  earnedTotal: number;
  spentTotal: number;
  lastActivityAt: string | null;
  /** Credit that expires soonest, if any. */
  expiring: { amount: number; at: string } | null;
};

export type Profile = {
  id: string;
  name: string;            // display name
  legalName: string | null;
  kennitalaMasked: string | null; // "010190-xxxx"
  phone: string | null;
  email: string | null;
  eidVerifiedAt: string | null;
  memberSince: string;
  walletToken: string;     // what the QR encodes (rotating in production)
  avatarUrl: string | null;
  marketingOptIn: boolean;
  notificationsEnabled: boolean;
};

export type PosVendor = 'noona' | 'upsell' | 'resto' | 'dk' | 'ls' | 'straumur' | 'regla' | 'other';

/**
 * The POS vendors that matter in Iceland (see docs/vild/research/tech-landscape.md §A).
 * `short` is the name used in running text on the site: "Noona, Upsell, …, Straumur".
 */
export const POS_VENDORS: { id: PosVendor; name: string; short: string; note: string; api: 'api' | 'partner' | 'scan' }[] = [
  { id: 'noona', name: 'Noona HQ (SalesCloud)', short: 'Noona', note: 'Opið API, webhooks og inneignarveski. Síminn Pay.', api: 'api' },
  { id: 'upsell', name: 'Upsell', short: 'Upsell', note: 'Subway, Serrano, Te & Kaffi og 50+ staðir. Samstarfstenging.', api: 'partner' },
  { id: 'resto', name: 'Resto', short: 'Resto', note: 'Veitingakassi, Teya og Adyen posar. Samstarfstenging.', api: 'partner' },
  { id: 'dk', name: 'dk POS', short: 'dk', note: 'dk hugbúnaður. API í bókhaldslagi.', api: 'partner' },
  { id: 'ls', name: 'LS Central', short: 'LS Central', note: 'Stærri keðjur. Innbyggt vildarkerfi.', api: 'api' },
  { id: 'straumur', name: 'Straumur posi (Adyen)', short: 'Straumur', note: 'Terminal API, VAS-vottaðir posar.', api: 'api' },
  { id: 'regla', name: 'Regla', short: 'Regla', note: 'Bókhald + kassi.', api: 'partner' },
  { id: 'other', name: 'Annað', short: 'Annað', note: 'Skönnun á VILD-korti við kassa.', api: 'scan' },
];

export type MerchantUser = {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  locationIds: string[] | null; // null = all
};

export type MerchantStats = {
  merchantId: string;
  periodDays: number;
  purchases: number;
  revenue: number;
  /** Credit earned on purchases in the period (the chain's cost; the base of VILD's fee). */
  creditIssued: number;
  /** Welcome credit VILD gave new members in the period: funded by VILD, not part of creditIssued, not billed. */
  welcomeCredit?: number;
  creditRedeemed: number;
  returningCustomersPct: number;
  newMembers: number;
  avgBasket: number;
  /** daily series for the charts */
  daily: { date: string; revenue: number; issued: number; redeemed: number; purchases: number }[];
  topProducts: { productId: string; name: string; qty: number; credit: number }[];
  byLocation: { locationId: string; name: string; purchases: number; revenue: number }[];
};

export type Settlement = {
  id: string;
  merchantId: string;
  periodFrom: string;
  periodTo: string;
  creditIssued: number;
  creditRedeemed: number;
  platformFee: number;
  status: 'open' | 'invoiced' | 'paid';
};

/** QR token the till scans; the backend resolves it to a user + pocket. */
export type WalletPass = {
  token: string;
  issuedAt: string;
  expiresAt: string;
};

export type RedeemQuote = {
  merchantId: string;
  purchaseTotal: number;
  available: number;
  applied: number;
  toPay: number;
  willEarn: number;
};
