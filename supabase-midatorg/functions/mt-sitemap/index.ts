// mt-sitemap — XML sitemap for search engines: the public pages plus every upcoming
// event (/vidburdir/<id>). robots.txt on the site points here (Google and Bing accept a
// sitemap on another host when robots.txt lists it).
//
//   GET /functions/v1/mt-sitemap  → 200 application/xml (cached for an hour)
//
// Deployed with verify_jwt = false: crawlers send no token. Reads only public rows
// with the anon key, so row-level security applies exactly as on the site.
// Optional secret SITE_URL (default https://midatorg.lovable.app).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'hourly', priority: '1.0' },
  { path: '/kort', changefreq: 'hourly', priority: '0.8' },
  { path: '/um', changefreq: 'monthly', priority: '0.4' },
  { path: '/skilmalar', changefreq: 'monthly', priority: '0.3' },
  { path: '/personuvernd', changefreq: 'monthly', priority: '0.3' },
];

function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  return (
    '  <url>\n' +
    `    <loc>${xmlEscape(loc)}</loc>\n` +
    (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
    (changefreq ? `    <changefreq>${changefreq}</changefreq>\n` : '') +
    (priority ? `    <priority>${priority}</priority>\n` : '') +
    '  </url>\n'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const site = (Deno.env.get('SITE_URL') ?? 'https://midatorg.lovable.app').replace(/\/+$/, '');
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return new Response('Not configured', { status: 500 });

  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db
    .from('mt_events')
    .select('id, updated_at, starts_at')
    .eq('status', 'upcoming')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(5000);
  if (error) {
    console.error(JSON.stringify({ fn: 'mt-sitemap', level: 'error', msg: 'query failed', code: error.code }));
    return new Response('Unavailable', { status: 503, headers: { 'Retry-After': '600' } });
  }

  let body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const page of STATIC_PAGES) body += urlEntry(site + page.path, undefined, page.changefreq, page.priority);
  for (const event of data ?? []) {
    const lastmod = event.updated_at ? new Date(event.updated_at).toISOString() : undefined;
    body += urlEntry(`${site}/vidburdir/${event.id}`, lastmod, 'daily', '0.7');
  }
  body += '</urlset>\n';

  return new Response(req.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
