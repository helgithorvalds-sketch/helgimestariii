// Fictional, non-sensitive demo data for the promo capture (no real customers).
const now = new Date(); now.setHours(0, 0, 0, 0);
const at = (days, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
const iso = (d) => new Date(Date.UTC(2026, 10, d, 10, 0, 0)).toISOString();
let n = 0;
const co = (name, owner, stage, extra = {}) => ({
  id: `demo-${++n}`,
  name, owner, company_id: `${4600000000 + n * 1371}`,
  logo_url: null, website_url: null, finna_url: null,
  phone: null, email: null, address: null, industry: null,
  lead_source: null, facebook_url: null, ja_url: null, google_url: null,
  category: null, registered_date: null, pitch: null,
  rejected: false, rejected_at: null, last_call_outcome: null,
  stage, preview_sub_status: null, finished_sub_status: null, paid_sub_status: null,
  estimated_price: 149000, custom_price: null,
  checklist: [], contacts: [], notes: '', personality_description: '',
  preview_sent: false, projected_earnings: 149000,
  amount_paid: null, paid_date: null,
  monthly_payment_amount: null, monthly_payment_start_date: null, monthly_payment_active: false,
  next_call_at: null, special_offer: false, is_done: false, chosen_v2: false, registered_in_svif: false,
  created_at: iso(1 + n),
  ...extra,
});

export const companies = [
  co('Bakarí Bjarkar', 'Björk Jónsdóttir', 'email_sent', { estimated_price: 129000 }),
  co('Kaffi Kría', 'Kári Ólafsson', 'email_sent'),
  co('Hárstofa Hlínar', 'Hlín Gunnarsdóttir', 'email_sent', { estimated_price: 99000 }),
  co('Vélaverk Ármanns', 'Ármann Þórsson', 'email_sent', { estimated_price: 189000 }),
  co('Kertagerð Kolbrúnar', 'Kolbrún Atladóttir', 'email_sent', { estimated_price: 119000 }),
  co('Blómabúðin Sóley', 'Sóley Magnúsdóttir', 'registered'),
  co('Fjallakaffi', 'Einar Hallsson', 'registered', { next_call_at: at(3, 14), estimated_price: 129000 }),
  co('Smiðja Sigga', 'Sigurður Pálsson', 'registered', { estimated_price: 169000 }),
  co('Hestaleiga Heklu', 'Hekla Árnadóttir', 'preview', { next_call_at: at(0, 10, 30), preview_sub_status: 'wanted_preview', estimated_price: 189000 }),
  co('Lopabúðin Ull', 'Ásdís Benediktsdóttir', 'preview', { preview_sub_status: 'wanted_preview' }),
  co('Sjósund Selvogs', 'Ragnar Ingason', 'preview', { preview_sub_status: 'wanted_preview', estimated_price: 99000 }),
  co('Garðyrkja Grímu', 'Gríma Sveinsdóttir', 'preview', { next_call_at: at(0, 13), preview_sub_status: 'sold_preview', estimated_price: 169000 }),
  co('Ljósmyndastofa Lóu', 'Lóa Haraldsdóttir', 'preview', { website_url: 'https://loa-ljosmyndir.example', notes: 'Vill fá myndasafn og bókunarform á forsíðu.', next_call_at: at(0, 15, 30), preview_sub_status: 'sold_preview', estimated_price: 219000 }),
  co('Prjónastofa Péturs', 'Pétur Hauksson', 'preview', { next_call_at: at(1, 9, 30), preview_sub_status: 'fifty_fifty' }),
  co('Hjólaverkstæðið Hvel', 'Bjarki Tómasson', 'preview', { preview_sub_status: 'fifty_fifty', estimated_price: 129000 }),
  co('Tannstofa Eyju', 'Eyja Kristjánsdóttir', 'preview', { preview_sub_status: 'needed_website', estimated_price: 249000 }),
  co('Bílaþjónusta Bárðar', 'Bárður Egilsson', 'finished', { next_call_at: at(1, 11), finished_sub_status: 'not_contacted', logo_url: 'https://example.com/m1', estimated_price: 189000 }),
  co('Jógastöð Jöklu', 'Jökla Ragnarsdóttir', 'finished', { next_call_at: at(5, 10), finished_sub_status: 'not_contacted', logo_url: 'https://example.com/m2' }),
  co('Fiskbúð Fróða', 'Fróði Helgason', 'finished', { finished_sub_status: 'contacted', logo_url: 'https://example.com/m3', estimated_price: 129000 }),
  co('Sútunarstofan Skinn', 'Védís Karlsdóttir', 'finished', { finished_sub_status: 'contacted', logo_url: 'https://example.com/m7', estimated_price: 169000 }),
  co('Brugghús Bjargs', 'Hrafn Gíslason', 'finished', { finished_sub_status: 'website_changed', logo_url: 'https://example.com/m8', estimated_price: 219000 }),
  co('Steinsmiðja Stapa', 'Örn Valsson', 'finished', { finished_sub_status: 'krafa', logo_url: 'https://example.com/m9' }),
  co('Gistiheimilið Lind', 'Lind Davíðsdóttir', 'paid', { paid_sub_status: 'fully_paid', amount_paid: 189000, paid_date: iso(20), logo_url: 'https://example.com/m4' }),
  co('Rafverk Röðuls', 'Röðull Bjarnason', 'paid', { paid_sub_status: 'fully_paid', amount_paid: 149000, paid_date: iso(22), logo_url: 'https://example.com/m5' }),
  co('Kökuhús Kötlu', 'Katla Friðriksdóttir', 'paid', { paid_sub_status: 'fully_paid', amount_paid: 129000, paid_date: iso(23), logo_url: 'https://example.com/m10' }),
  co('Ísbúð Unnar', 'Unnur Óskarsdóttir', 'paid', { paid_sub_status: 'partially_paid', amount_paid: 75000, paid_date: iso(24), logo_url: 'https://example.com/m6' }),
  co('Hundasnyrting Heiðu', 'Heiða Logadóttir', 'paid', { paid_sub_status: 'partially_paid', amount_paid: 60000, paid_date: iso(25), logo_url: 'https://example.com/m11' }),
  co('Hótel Hraunbrún', 'Ari Stefánsson', 'lead'),
  co('Sundlaugarkaffi', 'Rán Ólafsdóttir', 'lead'),
];

export const tasks = [
  { id: 't1', company_id: 'demo-9', description: 'Senda sýnishorn', deadline: iso(28), completed: false, completed_at: null, created_at: iso(20) },
  { id: 't2', company_id: 'demo-17', description: 'Hringja og kynna nýju síðuna', deadline: iso(29), completed: false, completed_at: null, created_at: iso(21) },
  { id: 't3', company_id: 'demo-6', description: 'Fá myndir af búðinni', deadline: iso(30), completed: false, completed_at: null, created_at: iso(22) },
];
export const call_logs = [];
