import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries((await import('node:fs')).readFileSync('/home/user/helgimestariii/.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const sb = createClient(env.VITE_MIDATORG_SUPABASE_URL, env.VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY);
const { data, error } = await sb.from('mt_events_market').select('id,title,starts_at,min_ask,tickets_available,wanted_tickets').eq('status','upcoming').order('starts_at').limit(4);
console.log(error ? 'ERROR ' + JSON.stringify(error) : JSON.stringify(data, null, 1));
const { data: l, error: e2 } = await sb.from('mt_listings').select('id,asking_price,status').limit(2);
console.log(e2 ? 'ERROR ' + JSON.stringify(e2) : 'listings ok: ' + l.length);
const { error: e3 } = await sb.auth.signInWithPassword({ email: 'kaupandi@test.midatorg.local', password: 'Prufa-kaupandi-2026' });
console.log(e3 ? 'LOGIN ERROR ' + e3.message : 'login ok');
