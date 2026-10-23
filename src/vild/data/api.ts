/**
 * The data layer contract. Two implementations: `mock` (in-memory, seeded,
 * persisted to localStorage so a demo survives reloads) and `supabase`
 * (the real backend in supabase-vild/). Pick with VITE_VILD_DATA=mock|supabase
 * (default: mock until the Supabase project exists).
 */
import type {
  LedgerEntry,
  Location,
  Merchant,
  MerchantStats,
  MerchantUser,
  Offer,
  Pocket,
  Product,
  Profile,
  RedeemQuote,
  RewardRule,
  Sector,
  Settlement,
  WalletPass,
} from '../lib/types';

export type Session = { userId: string; kind: 'consumer' } | { userId: string; kind: 'merchant'; merchantId: string };

export type Unsubscribe = () => void;

export interface VildApi {
  // ---- session -----------------------------------------------------------
  getSession(): Promise<Session | null>;
  onSessionChange(cb: (s: Session | null) => void): Unsubscribe;
  /** Step 1 of phone login: sends an SMS code. Mock accepts any number. */
  startPhoneLogin(phone: string): Promise<void>;
  /** Step 2: the code. Mock accepts "123456". */
  verifyPhoneLogin(phone: string, code: string): Promise<Session>;
  /** Electronic ID. Returns the URL to open (real) or completes instantly (mock). */
  startEidLogin(next?: string): Promise<{ url: string | null; session: Session | null }>;
  merchantLogin(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;

  // ---- catalogue ---------------------------------------------------------
  getSectors(): Promise<Sector[]>;
  getMerchants(): Promise<Merchant[]>;
  getMerchant(slug: string): Promise<Merchant | null>;
  getLocations(merchantId?: string): Promise<Location[]>;
  getLocation(id: string): Promise<Location | null>;
  getProducts(merchantId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getOffers(merchantId?: string): Promise<Offer[]>;
  getOffer(id: string): Promise<Offer | null>;

  // ---- wallet ------------------------------------------------------------
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Pick<Profile, 'name' | 'email' | 'marketingOptIn' | 'notificationsEnabled'>>): Promise<Profile>;
  getPockets(): Promise<Pocket[]>;
  getLedger(opts?: { merchantId?: string; limit?: number }): Promise<LedgerEntry[]>;
  getLedgerEntry(id: string): Promise<LedgerEntry | null>;
  /** A short-lived token for the QR / wallet pass. */
  getWalletPass(): Promise<WalletPass>;
  /** What happens if I pay `purchaseTotal` at this merchant now. */
  redeemQuote(merchantId: string, purchaseTotal: number, useCredit: boolean): Promise<RedeemQuote>;
  /**
   * Demo / POS entry point: records a purchase. In production the POS webhook
   * calls the backend; the app only reads. Kept on the interface so the demo
   * "Prófa kaup" flow and the merchant "Prufukassi" can exercise the ledger.
   */
  recordPurchase(input: { merchantId: string; locationId: string; items: { productId: string; qty: number }[]; useCredit: boolean }): Promise<LedgerEntry[]>;

  // ---- merchant portal ---------------------------------------------------
  getMerchantStats(merchantId: string, periodDays: number): Promise<MerchantStats>;
  getRewardRules(merchantId: string): Promise<RewardRule[]>;
  saveRewardRule(rule: Omit<RewardRule, 'id' | 'createdAt'> & { id?: string }): Promise<RewardRule>;
  deleteRewardRule(id: string): Promise<void>;
  updateLocation(id: string, patch: Partial<Pick<Location, 'openingHours' | 'phone' | 'acceptsRedemption' | 'posVendor' | 'posStatus'>>): Promise<Location>;
  getSettlements(merchantId: string): Promise<Settlement[]>;
  getMerchantUsers(merchantId: string): Promise<MerchantUser[]>;
  inviteMerchantUser(input: Omit<MerchantUser, 'id'>): Promise<MerchantUser>;
  removeMerchantUser(id: string): Promise<void>;
  updateMerchant(id: string, patch: Partial<Pick<Merchant, 'description' | 'defaultRatePct' | 'website'>>): Promise<Merchant>;

  // ---- till (cashier) --------------------------------------------------
  /** The cashier scans or types a VILD code; resolves to the customer's pocket at this merchant. Null when unknown. */
  tillLookup(token: string): Promise<{ firstName: string; balance: number; merchantId: string } | null>;
  /** The cashier confirms a sale: optionally spends credit, then earns on the part paid with money (merchant default rate). */
  tillCharge(input: { token: string; locationId: string; amount: number; useCredit: boolean }): Promise<{ applied: number; toPay: number; earned: number; balanceAfter: number }>;
}

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Þú þarft að skrá þig inn.',
  INVALID_CODE: 'Rangur kóði. Reyndu aftur.',
  INVALID_PHONE: 'Sláðu inn gilt símanúmer (7 tölustafir).',
  INVALID_LOGIN: 'Rangt netfang eða lykilorð.',
  NOT_FOUND: 'Fannst ekki.',
  INSUFFICIENT_CREDIT: 'Ekki næg inneign.',
  EID_NOT_CONFIGURED: 'Rafræn skilríki eru ekki virk ennþá.',
  EID_CANCELLED: 'Hætt var við auðkenningu.',
  EID_FAILED: 'Auðkenning tókst ekki. Reyndu aftur.',
  NETWORK: 'Náði ekki sambandi. Athugaðu nettenginguna.',
  UNKNOWN: 'Eitthvað fór úrskeiðis. Reyndu aftur.',
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return ERROR_MESSAGES[err.code] ?? ERROR_MESSAGES.UNKNOWN;
  if (err instanceof Error && ERROR_MESSAGES[err.message]) return ERROR_MESSAGES[err.message];
  if (err instanceof TypeError) return ERROR_MESSAGES.NETWORK;
  return ERROR_MESSAGES.UNKNOWN;
}
