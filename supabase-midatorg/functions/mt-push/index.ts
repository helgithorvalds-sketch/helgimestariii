// mt-push — delivers one Miðatorg notification to the owner's phones.
//
//   POST /functions/v1/mt-push  { notification_id }   header x-mt-cron-secret
//   Called by the mt_notifications_push trigger (migration 0013) while push_enabled is on.
//
// iOS devices get it straight from Apple (APNs, token-based auth with a .p8 key);
// Android devices through Firebase Cloud Messaging (HTTP v1 with a service account).
// Tokens the services report as dead are deleted. Deployed with verify_jwt = false:
// the caller is the database, authenticated by the cron secret. Standalone file.
//
// Secrets (Supabase → Edge Functions → Secrets); a platform without its secrets is skipped:
//   APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (contents of the .p8 file),
//   APNS_BUNDLE_ID (default is.midatorg.app), APNS_SANDBOX ("true" for development builds)
//   FCM_SERVICE_ACCOUNT (the Firebase service-account JSON, as one line)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'npm:jose@5';

const FN = 'mt-push';

function log(level: 'info' | 'warn' | 'error', msg: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), fn: FN, level, msg, ...data });
  if (level === 'error') console.error(line);
  else console.log(line);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0 && a.length === b.length;
}

type Push = { title: string; body: string; link: string | null };

// ---------------------------------------------------------------------------
// APNs
// ---------------------------------------------------------------------------
let apnsJwt: { token: string; at: number } | null = null;

async function apnsToken(): Promise<string | null> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const pem = Deno.env.get('APNS_PRIVATE_KEY');
  if (!keyId || !teamId || !pem) return null;
  // Apple accepts a provider token for up to an hour; refresh after 50 minutes.
  if (apnsJwt && Date.now() - apnsJwt.at < 50 * 60 * 1000) return apnsJwt.token;
  const key = await importPKCS8(pem.replace(/\\n/g, '\n'), 'ES256');
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: keyId }).setIssuer(teamId).setIssuedAt().sign(key);
  apnsJwt = { token, at: Date.now() };
  return token;
}

/** Returns 'ok', 'dead' (delete the token) or 'error'. */
async function sendApns(deviceToken: string, push: Push): Promise<'ok' | 'dead' | 'error'> {
  const jwt = await apnsToken();
  if (!jwt) return 'error';
  const host = Deno.env.get('APNS_SANDBOX') === 'true' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const res = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': Deno.env.get('APNS_BUNDLE_ID') ?? 'is.midatorg.app',
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps: { alert: { title: push.title, body: push.body }, sound: 'default' }, link: push.link }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return 'ok';
  const reason = ((await res.json().catch(() => ({}))) as { reason?: string }).reason ?? '';
  if (res.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered') return 'dead';
  log('warn', 'apns rejected', { status: res.status, reason });
  return 'error';
}

// ---------------------------------------------------------------------------
// FCM (Android)
// ---------------------------------------------------------------------------
type ServiceAccount = { client_email: string; private_key: string; project_id: string };
let fcmAccess: { token: string; until: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    return sa.client_email && sa.private_key && sa.project_id ? sa : null;
  } catch {
    return null;
  }
}

async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  if (fcmAccess && Date.now() < fcmAccess.until) return fcmAccess.token;
  const key = await importPKCS8(sa.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`oauth HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  fcmAccess = { token: data.access_token, until: Date.now() + (data.expires_in - 120) * 1000 };
  return data.access_token;
}

async function sendFcm(deviceToken: string, push: Push): Promise<'ok' | 'dead' | 'error'> {
  const sa = serviceAccount();
  if (!sa) return 'error';
  const access = await fcmAccessToken(sa);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: push.title, body: push.body },
        data: push.link ? { link: push.link } : {},
        android: { priority: 'HIGH' },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return 'ok';
  const text = await res.text();
  if (res.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(text)) return 'dead';
  log('warn', 'fcm rejected', { status: res.status });
  return 'error';
}

// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'SERVER_MISCONFIGURED' }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const given = req.headers.get('x-mt-cron-secret')?.trim() ?? '';
  const { data: secretRow } = await db.from('mt_settings').select('value').eq('key', 'cron_secret').maybeSingle();
  const expected = typeof secretRow?.value === 'string' ? secretRow.value : '';
  if (!given || !expected || !(await sameSecret(given, expected))) return json({ error: 'NOT_ALLOWED' }, 403);

  let id = '';
  try {
    id = String(((await req.json()) as { notification_id?: string }).notification_id ?? '');
  } catch {
    return json({ error: 'BAD_JSON' }, 400);
  }
  const { data: n } = await db.from('mt_notifications').select('id, user_id, title, body, link').eq('id', id).maybeSingle();
  if (!n) return json({ sent: 0, reason: 'NOT_FOUND' });

  const { data: tokens } = await db.from('mt_push_tokens').select('id, token, platform').eq('user_id', n.user_id);
  const push: Push = { title: n.title, body: n.body ?? '', link: n.link };
  let sent = 0;
  const dead: string[] = [];
  for (const t of tokens ?? []) {
    try {
      const result = t.platform === 'ios' ? await sendApns(t.token, push) : await sendFcm(t.token, push);
      if (result === 'ok') sent += 1;
      else if (result === 'dead') dead.push(t.id);
    } catch (err) {
      log('error', 'send failed', { platform: t.platform, message: err instanceof Error ? err.message : 'unknown' });
    }
  }
  if (dead.length) await db.from('mt_push_tokens').delete().in('id', dead);
  log('info', 'delivered', { sent, devices: tokens?.length ?? 0, removed: dead.length });
  return json({ sent, removed: dead.length });
});
