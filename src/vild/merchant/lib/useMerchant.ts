/**
 * The signed-in chain and user, for every portal page.
 * merchantId comes from the session; the merchant record and the user row
 * from the normal queries so a change (e.g. the default rate) shows everywhere.
 */
import { useAuth } from '../../lib/auth';
import { useMerchantUsers, useMerchants } from '../../lib/queries';
import type { Merchant, MerchantUser } from '../../lib/types';

export function useMerchant(): { merchantId: string; merchant: Merchant | undefined; user: MerchantUser | undefined; loading: boolean } {
  const { merchantId, session } = useAuth();
  const id = merchantId ?? '';
  const merchants = useMerchants();
  const users = useMerchantUsers(merchantId);
  const merchant = merchants.data?.find((m) => m.id === id);
  // The mock's session id is the team row id; the live session id is the login account (user_id on the team row).
  const user = users.data?.find((u) => u.id === session?.userId || (u.authUserId != null && u.authUserId === session?.userId));
  return { merchantId: id, merchant, user, loading: merchants.isLoading || users.isLoading };
}

export const ROLE_LABELS: Record<MerchantUser['role'], string> = { owner: 'Eigandi', manager: 'Stjórnandi', staff: 'Starfsmaður' };
