// Google Wallet "Save to Wallet" link for a loyalty object (Google Wallet Passes API).
// The link is https://pay.google.com/gp/v/save/<JWT>, the JWT is RS256-signed with the
// issuer's service-account key and carries the loyalty class + object inline, so no
// server-side object creation is needed for a first version. Balance updates on an
// already-saved pass need the REST API (PATCH loyaltyObject) — not implemented here;
// the pass shows the balance as of the moment the link was made and the app remains
// the live view. [Google's class/object field names below follow the public docs as
// of 2025; verify when the issuer account exists.]
//
// Secrets: GOOGLE_WALLET_ISSUER_ID (numeric), GOOGLE_WALLET_SA_JSON (the service-account
// JSON, with client_email and private_key).
import { SignJWT, importPKCS8 } from 'npm:jose@5';

export type GoogleConfig = { issuerId: string; clientEmail: string; privateKey: string };

export function googleConfig(): GoogleConfig | null {
  const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID')?.trim();
  const raw = Deno.env.get('GOOGLE_WALLET_SA_JSON')?.trim();
  if (!issuerId || !raw) return null;
  try {
    const sa = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!sa.client_email || !sa.private_key) return null;
    return { issuerId, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

export type GooglePassInput = {
  userId: string;
  holderName: string;
  barcodeToken: string;
  primaryMerchantName: string;
  balance: number;
  origins: string[];
};

export function loyaltyPayload(cfg: GoogleConfig, input: GooglePassInput) {
  const classId = `${cfg.issuerId}.vild_card`;
  const objectId = `${cfg.issuerId}.${input.userId.replace(/-/g, '')}`;
  return {
    loyaltyClasses: [
      {
        id: classId,
        issuerName: 'VILD',
        programName: 'VILD inneign',
        reviewStatus: 'UNDER_REVIEW',
        hexBackgroundColor: '#072B1D',
        programLogo: { sourceUri: { uri: 'https://helgimestariii.lovable.app/vild/img/pass-logo.png' }, contentDescription: { defaultValue: { language: 'is', value: 'VILD' } } },
      },
    ],
    loyaltyObjects: [
      {
        id: objectId,
        classId,
        state: 'ACTIVE',
        accountId: input.userId,
        accountName: input.holderName,
        loyaltyPoints: { label: `Inneign · ${input.primaryMerchantName}`, balance: { money: { currencyCode: 'ISK', micros: String(Math.round(input.balance) * 1_000_000) } } },
        barcode: { type: 'QR_CODE', value: input.barcodeToken, alternateText: input.barcodeToken },
        textModulesData: [{ id: 'terms', header: 'Skilmálar', body: 'Inneign gildir aðeins hjá keðjunni sem gaf hana og rennur út 24 mánuðum eftir að hún var unnin.' }],
      },
    ],
  };
}

export async function saveUrl(cfg: GoogleConfig, input: GooglePassInput): Promise<string> {
  const key = await importPKCS8(cfg.privateKey, 'RS256');
  const jwt = await new SignJWT({ typ: 'savetowallet', origins: input.origins, payload: loyaltyPayload(cfg, input) })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(cfg.clientEmail)
    .setAudience('google')
    .setIssuedAt()
    .sign(key);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
