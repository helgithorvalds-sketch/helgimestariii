/**
 * Route helpers. The module is mounted at BASE ("/vild" inside the CRM build,
 * "" for the standalone app build — see vite.vild.config.ts).
 */
export const BASE: string = (import.meta.env.VITE_VILD_BASE as string | undefined) ?? '/vild';

export const paths = {
  // marketing site
  site: '/',
  siteForRestaurants: '/fyrir-veitingastadi',
  siteAbout: '/um-vild',
  siteFaq: '/spurningar',
  siteTerms: '/skilmalar',
  sitePrivacy: '/personuvernd',
  // consumer app
  app: '/app',
  appLogin: '/app/innskraning',
  appOnboarding: '/app/byrja',
  appHome: '/app',
  appPlaces: '/app/stadir',
  appPlace: (id: string) => `/app/stadir/${id}`,
  appMerchant: (slug: string) => `/app/kedjur/${slug}`,
  appProduct: (id: string) => `/app/vorur/${id}`,
  appOffer: (id: string) => `/app/tilbod/${id}`,
  appCard: '/app/kort',
  appHistory: '/app/yfirlit',
  appHistoryEntry: (id: string) => `/app/yfirlit/${id}`,
  appProfile: '/app/eg',
  appSettings: '/app/eg/stillingar',
  appEid: '/app/eg/skilriki',
  // merchant portal
  merchant: '/fyrirtaeki',
  merchantLogin: '/fyrirtaeki/innskraning',
  merchantDashboard: '/fyrirtaeki',
  merchantCredit: '/fyrirtaeki/inneign',
  merchantProducts: '/fyrirtaeki/vorur',
  merchantCampaigns: '/fyrirtaeki/herferdir',
  merchantLocations: '/fyrirtaeki/stadir',
  merchantPos: '/fyrirtaeki/kassakerfi',
  merchantSettlement: '/fyrirtaeki/uppgjor',
  merchantTeam: '/fyrirtaeki/teymi',
  merchantSettings: '/fyrirtaeki/stillingar',
} as const;

/** Absolute href inside the host app: href('/app') → "/vild/app". */
export function href(path: string): string {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${BASE}${path === '/' ? '' : path}` || '/';
}
