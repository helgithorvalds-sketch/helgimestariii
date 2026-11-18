/**
 * Tölvupósturinn í myndbandaherferðinni (nóv. 2026): frítt 10 sekúndna 2D/3D auglýsingamyndband.
 * Textinn er Helga sjálfs. Sami póstur fer til allra; það eina sem breytist er:
 *  - nafn fyrirtækisins, í eignarfalli („starfsemi GKS Innréttinga“) og þolfalli („fyrir GKS Innréttingar“),
 *  - hvað fyrirtækið selur: vörur, þjónustu, hvort tveggja eða lausnir (hugbúnað).
 * Þessi skrá er notuð bæði þegar pósturinn er sendur og á síðunni „Myndbönd“ í CRM,
 * svo þar sést nákvæmlega hvað hvert fyrirtæki fékk.
 */

export const MYNDBOND_SLOD = "https://nordurvefur.is/myndbond";
export const VEFUR_SLOD = "https://nordurvefur.is";

export type Tegund = "vorur" | "thjonusta" | "baedi" | "lausnir";

export interface PostInntak {
  name: string;
  /** Nafnið í eignarfalli. Vantar það er nefnifallið notað. */
  ef?: string;
  /** Nafnið í þolfalli. Vantar það er nefnifallið notað. */
  thf?: string;
  /** Hvað fyrirtækið selur. Vantar það er „vörurnar og þjónustan“ notað. */
  tegund?: Tegund;
}

/** „… teljum að {hvad} ykkar henti …“ og „… vekja áhuga á {ahugi} …“ */
const SELUR: Record<Tegund, { hvad: string; ahugi: string }> = {
  vorur: { hvad: "vörurnar", ahugi: "vörunum" },
  thjonusta: { hvad: "þjónustan", ahugi: "þjónustunni" },
  baedi: { hvad: "vörurnar og þjónustan", ahugi: "vörunum og þjónustunni" },
  lausnir: { hvad: "lausnirnar", ahugi: "lausnunum" },
};

/** Það sem breytist eftir fyrirtæki. `merkja` umlykur hvern hluta, t.d. feitletrun í sýnishorni. */
function breytilegt(c: PostInntak, merkja: (s: string) => string = (s) => s) {
  const s = SELUR[c.tegund || "baedi"];
  return {
    ef: merkja(c.ef || c.name),
    thf: merkja(c.thf || c.name),
    hvad: merkja(s.hvad),
    ahugi: merkja(s.ahugi),
  };
}

export function efnislina(c: PostInntak) {
  return `Nýtt markaðskerfi fyrir ${c.thf || c.name}`;
}

type Malsgrein = { t: string; feitt?: string; slod?: string };

function malsgreinar(c: PostInntak, merkja?: (s: string) => string): Malsgrein[] {
  const b = breytilegt(c, merkja);
  return [
    { t: "hæhæ" },
    { t: "Helgi Már heiti ég og rek fyrirtækið Norðurvef." },
    { t: `Við höfum verið að skoða starfsemi ${b.ef} og teljum að ${b.hvad} ykkar henti einstaklega vel fyrir þá nýju tegund markaðssetningar sem við höfum verið að vinna með.` },
    { t: "Undanfarið höfum við hjá Norðurvef sérhæft okkur í gerð stuttra auglýsingamyndbanda í 2D og 3D þar sem vörur og þjónusta fyrirtækja eru kynnt á skapandi, sjónrænan og grípandi hátt." },
    { t: "Hér má sjá nokkur dæmi um myndbönd sem við höfum gert:", slod: MYNDBOND_SLOD },
    {
      t: "Okkur langar að bjóða ykkur að prófa þessa nálgun með því að útbúa ",
      feitt: `10 sekúndna auglýsingamyndband fyrir ${b.thf}, ykkur að kostnaðarlausu og án allra skuldbindinga.`,
    },
    { t: `Markmiðið er að fanga athygli fólks, vekja áhuga á ${b.ahugi} og fá fleiri til að heimsækja vefsíðuna eða hafa samband.` },
    { t: "Við höfum meðal annars verið að vinna með myndbönd sem hafa sýnt fram á allt að 55% aukningu í umferð á vefsíður." },
    { t: "Við viljum gjarnan heyra hvort þið hafið einhverja ákveðna hugmynd að myndbandinu eða hvort þið viljið leyfa okkur að vera skapandi og koma ykkur á óvart." },
    { t: "Það væri gaman að fá stutt svar frá ykkur og heyra hvort þetta sé eitthvað sem gæti höfðað til ykkar." },
  ];
}

const UNDIRSKRIFT = ["Bestu kveðjur,", "Helgi Már Þorvaldsson", "Norðurvefur", "853 5147", VEFUR_SLOD];

/** Venjulegur texti (fyrir póstforrit sem sýna ekki HTML, og síðuna í CRM). */
export function postur(c: PostInntak) {
  const m = malsgreinar(c).map((p) => p.t + (p.feitt || "") + (p.slod ? `\n${p.slod}` : ""));
  return [...m, UNDIRSKRIFT.join("\n")].join("\n\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tengill = (url: string) => `<a href="${url}">${esc(url)}</a>`;

/**
 * HTML-útgáfan sem viðtakandinn sér: feitletrun eins og í fyrirmynd Helga og smellanlegir tenglar.
 * Með `synaBreytingar` er allt sem breytist eftir fyrirtæki feitletrað með gulum grunni (bara fyrir sýnishorn).
 */
export function posturHtml(c: PostInntak, synaBreytingar = false) {
  const OPNA = "\u0001", LOKA = "\u0002";
  const merkja = synaBreytingar ? (s: string) => `${OPNA}${s}${LOKA}` : undefined;
  const html = (s: string) =>
    esc(s).replaceAll(OPNA, '<b style="background:#fde68a">').replaceAll(LOKA, "</b>");
  const p = malsgreinar(c, merkja).map(
    (m) =>
      `<p style="margin:0 0 14px">${html(m.t)}${m.feitt ? `<b>${html(m.feitt)}</b>` : ""}${m.slod ? `<br>${tengill(m.slod)}` : ""}</p>`
  );
  const u = `<p style="margin:0">Bestu kveðjur,<br><b>Helgi Már Þorvaldsson</b><br>Norðurvefur<br>853 5147<br>${tengill(VEFUR_SLOD)}</p>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937">${p.join("")}${u}</div>`;
}
