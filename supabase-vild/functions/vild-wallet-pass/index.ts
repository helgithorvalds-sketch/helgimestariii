// vild-wallet-pass — Apple Wallet (.pkpass) and Google Wallet for the VILD card, plus the Apple
// web-service endpoints that keep the balance on the pass current.
//
// App-facing (Authorization: Bearer <Supabase JWT>)
//   GET  /vild-wallet-pass/pass              → application/vnd.apple.pkpass (storeCard, serial = user id)
//                                              503 { code: 'PASS_NOT_CONFIGURED', missing: [...] } until the certs exist
//   GET  /vild-wallet-pass/google-save-url   → 200 { url }   Google "Save to Wallet" link
//                                              503 { code: 'GOOGLE_NOT_CONFIGURED' }
//   POST /vild-wallet-pass/rotate            → 204           new barcode token (lost phone); re-add the pass afterwards
//
// Apple web service (Authorization: ApplePass <authenticationToken>, spec: "Adding a web service to update passes")
//   POST   /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serial}   { pushToken }   → 201 / 200
//   DELETE /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serial}                   → 200
//   GET    /v1/devices/{deviceLibraryId}/registrations/{passTypeId}?passesUpdatedSince=<tag>   → 200 { serialNumbers, lastUpdated } / 204
//   GET    /v1/passes/{passTypeId}/{serial}        (If-Modified-Since)                           → .pkpass / 304
//   POST   /v1/log                                 { logs: [...] }                                → 200
//
// Push sweep (x-vild-cron-secret = vild_settings.cron_secret, or a service-role bearer)
//   POST /vild-wallet-pass/push-updates  → { pushed, failed, unregistered }
//     Sends an empty APNs push to every registration whose pass_updated_at (bumped by the
//     vild_ledger insert trigger) is newer than its pushed_at. Wire it with pg_cron + pg_net every
//     minute (README "Wallet pass updates") or call it from the POS webhook after a purchase.
//
// Deploy with verify_jwt = false: Apple's devices call the /v1 endpoints without a Supabase JWT.
// The barcode carries vild_pass_secrets.barcode_token — a per-user secret distinct from the 60 s
// in-app QR, rotated on demand — never the user id, phone or kennitala.
//
// Secrets: PASS_TYPE_ID (pass.is.vild.card), APPLE_TEAM_ID, PASS_CERT_PEM (Pass Type ID certificate),
// PASS_KEY_PEM (its private key, PEM; PASS_KEY_PASSWORD if encrypted), WWDR_PEM (Apple WWDR G4
// intermediate), optional PASS_WEB_SERVICE_URL; APNS_* (apns.ts); GOOGLE_WALLET_* (google.ts);
// PASS_ORIGINS (comma list of app origins for the Google JWT).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import forge from 'npm:node-forge@1.3.1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { hasValidCronSecret, json, log, parseJson, preflight, readRawBody, requireUser, serviceClient, timingSafeEqual } from '../_shared/edge.ts';
import { buildManifest, buildPassJson, passImages, zipPass, type PassPocket } from './pass.ts';
import { apnsConfig, sendEmptyPush } from './apns.ts';
import { googleConfig, saveUrl } from './google.ts';

const FN = 'vild-wallet-pass';

type PassConfig = { passTypeId: string; teamId: string; certPem: string; keyPem: string; keyPassword: string | null; wwdrPem: string; webServiceURL: string };

function passConfig(): PassConfig | { missing: string[] } {
  const need = ['PASS_TYPE_ID', 'APPLE_TEAM_ID', 'PASS_CERT_PEM', 'PASS_KEY_PEM', 'WWDR_PEM'];
  const missing = need.filter((k) => !Deno.env.get(k)?.trim());
  if (missing.length) return { missing };
  const base = Deno.env.get('PASS_WEB_SERVICE_URL')?.trim() || `${Deno.env.get('SUPABASE_URL')}/functions/v1/vild-wallet-pass`;
  return {
    passTypeId: Deno.env.get('PASS_TYPE_ID')!.trim(),
    teamId: Deno.env.get('APPLE_TEAM_ID')!.trim(),
    certPem: Deno.env.get('PASS_CERT_PEM')!.replace(/\\n/g, '\n'),
    keyPem: Deno.env.get('PASS_KEY_PEM')!.replace(/\\n/g, '\n'),
    keyPassword: Deno.env.get('PASS_KEY_PASSWORD')?.trim() || null,
    wwdrPem: Deno.env.get('WWDR_PEM')!.replace(/\\n/g, '\n'),
    webServiceURL: base.replace(/\/+$/, ''),
  };
}

/** Detached PKCS#7 (CMS) signature over manifest.json with the Pass Type ID cert + WWDR chain. */
function signManifest(cfg: PassConfig, manifest: string): Uint8Array {
  const cert = forge.pki.certificateFromPem(cfg.certPem);
  const wwdr = forge.pki.certificateFromPem(cfg.wwdrPem);
  const key = cfg.keyPassword ? forge.pki.decryptRsaPrivateKey(cfg.keyPem, cfg.keyPassword) : forge.pki.privateKeyFromPem(cfg.keyPem);
  if (!key) throw new Error('PASS_KEY_PEM could not be read (wrong password?)');
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, 'utf8');
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Uint8Array.from(der, (c: string) => c.charCodeAt(0));
}

type PassData = { holderName: string; pockets: PassPocket[]; barcodeToken: string; authToken: string; updatedAt: string };

async function loadPassData(admin: SupabaseClient, userId: string): Promise<PassData | null> {
  const { data: profile } = await admin.from('vild_profiles').select('id, name, deleted_at').eq('id', userId).maybeSingle();
  if (!profile || profile.deleted_at) return null;
  const { data: secrets, error } = await admin.rpc('vild_ensure_pass_secrets', { p_user: userId });
  if (error || !secrets) throw new Error(`pass secrets: ${error?.message}`);
  const { data: pockets } = await admin.from('vild_pockets').select('merchant_id, balance, next_expiry_at').eq('user_id', userId);
  const { data: merchants } = await admin.from('vild_merchants').select('id, name, sector_slug, status').eq('status', 'active').order('created_at');
  const { data: sectors } = await admin.from('vild_sectors').select('slug, name');
  const sectorName = new Map((sectors ?? []).map((s) => [s.slug as string, s.name as string]));
  const byMerchant = new Map((pockets ?? []).map((p) => [p.merchant_id as string, p]));
  const list: PassPocket[] = (merchants ?? []).map((m) => {
    const p = byMerchant.get(m.id as string);
    return { merchantId: m.id as string, merchantName: m.name as string, sectorName: sectorName.get(m.sector_slug as string) ?? '', balance: Number(p?.balance ?? 0), nextExpiryAt: (p?.next_expiry_at as string | null) ?? null };
  });
  return {
    holderName: (profile.name as string) || 'Félagi',
    pockets: list,
    barcodeToken: secrets.barcode_token as string,
    authToken: secrets.auth_token as string,
    updatedAt: secrets.pass_updated_at as string,
  };
}

async function buildPkpass(cfg: PassConfig, userId: string, data: PassData): Promise<Uint8Array> {
  const passJson = buildPassJson({
    passTypeIdentifier: cfg.passTypeId,
    teamIdentifier: cfg.teamId,
    serialNumber: userId,
    authenticationToken: data.authToken,
    webServiceURL: cfg.webServiceURL,
    barcodeToken: data.barcodeToken,
    holderName: data.holderName,
    pockets: data.pockets,
    updatedAt: data.updatedAt,
  });
  const files: Record<string, Uint8Array> = { 'pass.json': new TextEncoder().encode(JSON.stringify(passJson)), ...passImages() };
  const manifest = await buildManifest(files);
  files['manifest.json'] = new TextEncoder().encode(manifest);
  files['signature'] = signManifest(cfg, manifest);
  return zipPass(files);
}

function pkpassResponse(bytes: Uint8Array, lastModified: string): Response {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="vild.pkpass"',
      'Last-Modified': new Date(lastModified).toUTCString(),
      'Cache-Control': 'no-store',
    },
  });
}

/** Apple sends "Authorization: ApplePass <authenticationToken>"; it must match the serial's stored token. */
async function applePassAuth(req: Request, admin: SupabaseClient, serial: string): Promise<boolean> {
  const m = /^ApplePass\s+(.+)$/i.exec(req.headers.get('authorization') ?? '');
  if (!m) return false;
  const { data } = await admin.from('vild_pass_secrets').select('auth_token').eq('user_id', serial).maybeSingle();
  if (!data?.auth_token) return false;
  return timingSafeEqual(m[1].trim(), data.auth_token as string);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function appleWebService(req: Request, admin: SupabaseClient, parts: string[]): Promise<Response> {
  const cfg = passConfig();
  // parts: ['v1', 'devices', dlid, 'registrations', ptid, serial?] | ['v1', 'passes', ptid, serial] | ['v1', 'log']
  if (parts[1] === 'log' && req.method === 'POST') {
    const raw = await readRawBody(req, 32_000);
    if (!(raw instanceof Response)) {
      const body = parseJson(raw) as { logs?: unknown[] } | undefined;
      log(FN, 'warn', 'apple device log', { count: Array.isArray(body?.logs) ? body!.logs!.length : 0, sample: String(body?.logs?.[0] ?? '').slice(0, 200) });
    }
    return new Response(null, { status: 200 });
  }
  if ('missing' in cfg) return json({ code: 'PASS_NOT_CONFIGURED' }, 503);

  if (parts[1] === 'devices' && parts[3] === 'registrations') {
    const dlid = parts[2];
    const ptid = parts[4];
    const serial = parts[5];
    if (ptid !== cfg.passTypeId) return new Response(null, { status: 404 });
    if (serial) {
      if (!UUID.test(serial) || !(await applePassAuth(req, admin, serial))) return new Response(null, { status: 401 });
      if (req.method === 'POST') {
        const raw = await readRawBody(req, 8_000);
        if (raw instanceof Response) return raw;
        const body = parseJson(raw) as { pushToken?: string } | undefined;
        if (!body?.pushToken || typeof body.pushToken !== 'string') return new Response(null, { status: 400 });
        const { data: existing } = await admin.from('vild_pass_registrations').select('push_token').match({ device_library_id: dlid, pass_type_id: ptid, serial_number: serial }).maybeSingle();
        await admin.from('vild_pass_registrations').upsert({ device_library_id: dlid, pass_type_id: ptid, serial_number: serial, push_token: body.pushToken }, { onConflict: 'device_library_id,pass_type_id,serial_number' });
        log(FN, 'info', 'registered', { fresh: !existing });
        return new Response(null, { status: existing ? 200 : 201 });
      }
      if (req.method === 'DELETE') {
        await admin.from('vild_pass_registrations').delete().match({ device_library_id: dlid, pass_type_id: ptid, serial_number: serial });
        return new Response(null, { status: 200 });
      }
      return new Response(null, { status: 405 });
    }
    if (req.method === 'GET') {
      // which of this device's passes changed since the tag (we use the ISO timestamp as the tag)
      const since = new URL(req.url).searchParams.get('passesUpdatedSince');
      const { data: regs } = await admin.from('vild_pass_registrations').select('serial_number').match({ device_library_id: dlid, pass_type_id: ptid });
      const serials = (regs ?? []).map((r) => r.serial_number as string);
      if (!serials.length) return new Response(null, { status: 404 });
      let q = admin.from('vild_pass_secrets').select('user_id, pass_updated_at').in('user_id', serials);
      if (since && !Number.isNaN(Date.parse(since))) q = q.gt('pass_updated_at', new Date(since).toISOString());
      const { data: changed } = await q;
      if (!changed?.length) return new Response(null, { status: 204 });
      const last = changed.map((c) => c.pass_updated_at as string).sort().at(-1)!;
      return json({ serialNumbers: changed.map((c) => c.user_id), lastUpdated: new Date(last).toISOString() });
    }
    return new Response(null, { status: 405 });
  }

  if (parts[1] === 'passes' && req.method === 'GET') {
    const ptid = parts[2];
    const serial = parts[3];
    if (ptid !== cfg.passTypeId || !UUID.test(serial ?? '')) return new Response(null, { status: 404 });
    if (!(await applePassAuth(req, admin, serial))) return new Response(null, { status: 401 });
    const data = await loadPassData(admin, serial);
    if (!data) return new Response(null, { status: 404 });
    const ims = req.headers.get('if-modified-since');
    if (ims && !Number.isNaN(Date.parse(ims)) && Date.parse(data.updatedAt) <= Date.parse(ims) + 1000) return new Response(null, { status: 304 });
    return pkpassResponse(await buildPkpass(cfg, serial, data), data.updatedAt);
  }
  return new Response(null, { status: 404 });
}

async function pushUpdates(admin: SupabaseClient): Promise<Response> {
  const cfg = passConfig();
  const apns = apnsConfig();
  if ('missing' in cfg || !apns) return json({ code: 'PASS_NOT_CONFIGURED', detail: 'PASS_TYPE_ID / APNS_* secrets' }, 503);
  const { data: regs, error } = await admin
    .from('vild_pass_registrations')
    .select('device_library_id, pass_type_id, serial_number, push_token, pushed_at, vild_pass_secrets!inner(pass_updated_at)')
    .eq('pass_type_id', cfg.passTypeId)
    .limit(500);
  if (error) throw new Error(`registrations: ${error.message}`);
  let pushed = 0;
  let failed = 0;
  let unregistered = 0;
  for (const r of regs ?? []) {
    const updated = (r as unknown as { vild_pass_secrets: { pass_updated_at: string } }).vild_pass_secrets?.pass_updated_at;
    if (!updated || (r.pushed_at && Date.parse(r.pushed_at as string) >= Date.parse(updated))) continue;
    const res = await sendEmptyPush(apns, r.push_token as string, cfg.passTypeId);
    const key = { device_library_id: r.device_library_id, pass_type_id: r.pass_type_id, serial_number: r.serial_number };
    if (res.ok) {
      pushed++;
      await admin.from('vild_pass_registrations').update({ pushed_at: new Date().toISOString() }).match(key);
    } else if (res.gone) {
      unregistered++;
      await admin.from('vild_pass_registrations').delete().match(key);
    } else {
      failed++;
      log(FN, 'warn', 'apns failed', { status: res.status, reason: res.reason });
    }
  }
  log(FN, 'info', 'push sweep', { pushed, failed, unregistered });
  return json({ pushed, failed, unregistered });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.indexOf('vild-wallet-pass');
  const route = fnIdx >= 0 ? parts.slice(fnIdx + 1) : parts;
  const admin = serviceClient();

  try {
    if (route[0] === 'v1') return await appleWebService(req, admin, route);

    if (route[0] === 'push-updates' && req.method === 'POST') {
      const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
      const isService = Boolean(token && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && (await timingSafeEqual(token, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)));
      if (!isService && !(await hasValidCronSecret(req, admin))) return json({ code: 'AUTH_REQUIRED' }, 401);
      return await pushUpdates(admin);
    }

    const user = await requireUser(req, admin);
    if (user instanceof Response) return user;

    if (route[0] === 'pass' && req.method === 'GET') {
      const cfg = passConfig();
      if ('missing' in cfg) {
        return json({ code: 'PASS_NOT_CONFIGURED', missing: cfg.missing, how: 'Create a Pass Type ID + certificate in the Apple Developer portal, export cert + key as PEM, download the WWDR G4 certificate, and set the secrets listed in supabase-vild/README.md.' }, 503);
      }
      const data = await loadPassData(admin, user.userId);
      if (!data) return json({ code: 'NOT_FOUND' }, 404);
      log(FN, 'info', 'pass issued');
      return pkpassResponse(await buildPkpass(cfg, user.userId, data), data.updatedAt);
    }

    if (route[0] === 'google-save-url' && req.method === 'GET') {
      const g = googleConfig();
      if (!g) return json({ code: 'GOOGLE_NOT_CONFIGURED', how: 'Create a Google Wallet issuer account and a service account; set GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SA_JSON.' }, 503);
      const data = await loadPassData(admin, user.userId);
      if (!data) return json({ code: 'NOT_FOUND' }, 404);
      const primary = data.pockets[0];
      const origins = (Deno.env.get('PASS_ORIGINS') ?? Deno.env.get('EID_APP_ORIGIN') ?? '').split(/[\s,]+/).filter(Boolean);
      const link = await saveUrl(g, { userId: user.userId, holderName: data.holderName, barcodeToken: data.barcodeToken, primaryMerchantName: primary?.merchantName ?? 'VILD', balance: primary?.balance ?? 0, origins });
      return json({ url: link });
    }

    if (route[0] === 'rotate' && req.method === 'POST') {
      const { error } = await admin.rpc('vild_rotate_pass_token', { p_user: user.userId });
      if (error) return json({ code: 'UNKNOWN' }, 500);
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return json({ code: 'NOT_FOUND' }, 404);
  } catch (err) {
    log(FN, 'error', 'unhandled', { message: err instanceof Error ? err.message : 'unknown' });
    return json({ code: 'UNKNOWN' }, 500);
  }
});
