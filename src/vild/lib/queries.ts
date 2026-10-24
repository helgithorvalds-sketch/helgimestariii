/**
 * react-query hooks over the data layer. Keys are namespaced "vild/…".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../data';
import type { Location, Merchant, MerchantUser, RewardRule } from './types';

const K = {
  sectors: ['vild', 'sectors'] as const,
  merchants: ['vild', 'merchants'] as const,
  merchant: (slug: string) => ['vild', 'merchant', slug] as const,
  locations: (merchantId?: string) => ['vild', 'locations', merchantId ?? 'all'] as const,
  location: (id: string) => ['vild', 'location', id] as const,
  products: (merchantId: string) => ['vild', 'products', merchantId] as const,
  product: (id: string) => ['vild', 'product', id] as const,
  offers: (merchantId?: string) => ['vild', 'offers', merchantId ?? 'all'] as const,
  offer: (id: string) => ['vild', 'offer', id] as const,
  profile: ['vild', 'profile'] as const,
  pockets: ['vild', 'pockets'] as const,
  ledger: (merchantId?: string, limit?: number) => ['vild', 'ledger', merchantId ?? 'all', limit ?? 0] as const,
  ledgerEntry: (id: string) => ['vild', 'ledgerEntry', id] as const,
  pass: ['vild', 'pass'] as const,
  stats: (merchantId: string, days: number) => ['vild', 'stats', merchantId, days] as const,
  rules: (merchantId: string) => ['vild', 'rules', merchantId] as const,
  settlements: (merchantId: string) => ['vild', 'settlements', merchantId] as const,
  users: (merchantId: string) => ['vild', 'users', merchantId] as const,
};
export const queryKeys = K;

export const useSectors = () => useQuery({ queryKey: K.sectors, queryFn: () => api().getSectors(), staleTime: Infinity });
export const useMerchants = () => useQuery({ queryKey: K.merchants, queryFn: () => api().getMerchants(), staleTime: 60_000 });
export const useMerchant = (slug: string | undefined) => useQuery({ queryKey: K.merchant(slug ?? ''), queryFn: () => api().getMerchant(slug!), enabled: Boolean(slug) });
export const useLocations = (merchantId?: string) => useQuery({ queryKey: K.locations(merchantId), queryFn: () => api().getLocations(merchantId), staleTime: 60_000 });
export const useLocation = (id: string | undefined) => useQuery({ queryKey: K.location(id ?? ''), queryFn: () => api().getLocation(id!), enabled: Boolean(id) });
export const useProducts = (merchantId: string | undefined) => useQuery({ queryKey: K.products(merchantId ?? ''), queryFn: () => api().getProducts(merchantId!), enabled: Boolean(merchantId), staleTime: 30_000 });
export const useProduct = (id: string | undefined) => useQuery({ queryKey: K.product(id ?? ''), queryFn: () => api().getProduct(id!), enabled: Boolean(id) });
export const useOffers = (merchantId?: string) => useQuery({ queryKey: K.offers(merchantId), queryFn: () => api().getOffers(merchantId), staleTime: 60_000 });
export const useOffer = (id: string | undefined) => useQuery({ queryKey: K.offer(id ?? ''), queryFn: () => api().getOffer(id!), enabled: Boolean(id) });

export const useProfile = () => useQuery({ queryKey: K.profile, queryFn: () => api().getProfile() });
export const usePockets = () => useQuery({ queryKey: K.pockets, queryFn: () => api().getPockets() });
export const useLedger = (merchantId?: string, limit?: number) => useQuery({ queryKey: K.ledger(merchantId, limit), queryFn: () => api().getLedger({ merchantId, limit }) });
export const useLedgerEntry = (id: string | undefined) => useQuery({ queryKey: K.ledgerEntry(id ?? ''), queryFn: () => api().getLedgerEntry(id!), enabled: Boolean(id) });
export const useWalletPass = () => useQuery({ queryKey: K.pass, queryFn: () => api().getWalletPass(), refetchInterval: 45_000, staleTime: 40_000 });

export function useRecordPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<ReturnType<typeof api>['recordPurchase']>[0]) => api().recordPurchase(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vild', 'pockets'] });
      void qc.invalidateQueries({ queryKey: ['vild', 'ledger'] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<ReturnType<typeof api>['updateProfile']>[0]) => api().updateProfile(patch),
    onSuccess: (p) => qc.setQueryData(K.profile, p),
  });
}

// ---- merchant ------------------------------------------------------------
export const useMerchantStats = (merchantId: string | null, days: number) => useQuery({ queryKey: K.stats(merchantId ?? '', days), queryFn: () => api().getMerchantStats(merchantId!, days), enabled: Boolean(merchantId) });
export const useRewardRules = (merchantId: string | null) => useQuery({ queryKey: K.rules(merchantId ?? ''), queryFn: () => api().getRewardRules(merchantId!), enabled: Boolean(merchantId) });
export const useSettlements = (merchantId: string | null) => useQuery({ queryKey: K.settlements(merchantId ?? ''), queryFn: () => api().getSettlements(merchantId!), enabled: Boolean(merchantId) });
export const useMerchantUsers = (merchantId: string | null) => useQuery({ queryKey: K.users(merchantId ?? ''), queryFn: () => api().getMerchantUsers(merchantId!), enabled: Boolean(merchantId) });

export function useSaveRule(merchantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Omit<RewardRule, 'id' | 'createdAt'> & { id?: string }) => api().saveRewardRule(rule),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: K.rules(merchantId) });
      void qc.invalidateQueries({ queryKey: ['vild', 'products'] });
    },
  });
}
export function useDeleteRule(merchantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api().deleteRewardRule(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: K.rules(merchantId) });
      void qc.invalidateQueries({ queryKey: ['vild', 'products'] });
    },
  });
}
export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<ReturnType<typeof api>['updateLocation']>[1] }) => api().updateLocation(id, patch),
    onSuccess: (loc: Location) => {
      void qc.invalidateQueries({ queryKey: ['vild', 'locations'] });
      qc.setQueryData(K.location(loc.id), loc);
    },
  });
}
export function useUpdateMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<ReturnType<typeof api>['updateMerchant']>[1] }) => api().updateMerchant(id, patch),
    onSuccess: (m: Merchant) => {
      void qc.invalidateQueries({ queryKey: K.merchants });
      qc.setQueryData(K.merchant(m.slug), m);
      void qc.invalidateQueries({ queryKey: ['vild', 'rules'] });
      void qc.invalidateQueries({ queryKey: ['vild', 'products'] });
    },
  });
}
export function useInviteUser(merchantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<MerchantUser, 'id'>) => api().inviteMerchantUser(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: K.users(merchantId) }),
  });
}
export function useRemoveUser(merchantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api().removeMerchantUser(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: K.users(merchantId) }),
  });
}

// ---- till (cashier simulator) --------------------------------------------
export function useTillLookup() {
  return useMutation({ mutationFn: (token: string) => api().tillLookup(token) });
}
export function useTillCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<ReturnType<typeof api>['tillCharge']>[0]) => api().tillCharge(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vild', 'pockets'] });
      void qc.invalidateQueries({ queryKey: ['vild', 'ledger'] });
    },
  });
}
