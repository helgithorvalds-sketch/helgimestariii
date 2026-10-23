// Empty APNs push for Wallet passes (token-based auth). Apple: send an empty JSON
// payload to the device's pushToken with apns-topic = the pass type identifier; the
// device then calls GET /v1/devices/…/registrations/… and fetches the new pass.
// APNs requires HTTP/2; Deno's fetch negotiates h2 over TLS (verify on first deploy).
//
// Secrets: APNS_KEY_ID (the .p8 key id), APNS_TEAM_ID, APNS_KEY_PEM (the .p8 contents),
// optional APNS_SANDBOX=true for api.sandbox.push.apple.com (Wallet passes normally
// use production even in development).
import { SignJWT, importPKCS8 } from 'npm:jose@5';

type ApnsConfig = { keyId: string; teamId: string; keyPem: string; sandbox: boolean };

export function apnsConfig(): ApnsConfig | null {
  const keyId = Deno.env.get('APNS_KEY_ID')?.trim();
  const teamId = Deno.env.get('APNS_TEAM_ID')?.trim();
  const keyPem = Deno.env.get('APNS_KEY_PEM')?.trim();
  if (!keyId || !teamId || !keyPem) return null;
  return { keyId, teamId, keyPem: keyPem.replace(/\\n/g, '\n'), sandbox: Deno.env.get('APNS_SANDBOX') === 'true' };
}

let jwtCache: { value: string; at: number } | null = null;

/** Provider token: ES256 JWT { iss: team, iat }, header { kid }. Apple accepts a token for up to an hour; we refresh after 50 min. */
async function providerToken(cfg: ApnsConfig): Promise<string> {
  if (jwtCache && Date.now() - jwtCache.at < 50 * 60 * 1000) return jwtCache.value;
  const key = await importPKCS8(cfg.keyPem, 'ES256');
  const value = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: cfg.keyId }).setIssuer(cfg.teamId).setIssuedAt().sign(key);
  jwtCache = { value, at: Date.now() };
  return value;
}

export type PushResult = { ok: boolean; status: number; reason?: string; gone?: boolean };

/** POST an empty notification. gone = Apple says the device token is no longer valid (unregister it). */
export async function sendEmptyPush(cfg: ApnsConfig, pushToken: string, topic: string): Promise<PushResult> {
  const host = cfg.sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const res = await fetch(`${host}/3/device/${encodeURIComponent(pushToken)}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await providerToken(cfg)}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return { ok: true, status: res.status };
  let reason: string | undefined;
  try {
    reason = ((await res.json()) as { reason?: string }).reason;
  } catch {
    /* no body */
  }
  return { ok: false, status: res.status, reason, gone: res.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' };
}
