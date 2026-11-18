/**
 * Tölvupósturinn í myndbandaherferðinni (nóv. 2026): frítt 10 sekúndna 2D/3D auglýsingamyndband.
 * Textinn er Helga sjálfs. Sami póstur fer til allra; aðeins nafn fyrirtækisins breytist,
 * í eignarfalli („starfsemi GKS Innréttinga“) og þolfalli („fyrir GKS Innréttingar“).
 * Þessi skrá er notuð bæði þegar pósturinn er sendur og á síðunni „Myndbönd“ í CRM,
 * svo þar sést nákvæmlega hvað hvert fyrirtæki fékk.
 */

export const MYNDBOND_SLOD = "https://nordurvefur.is/myndbond";
export const VEFUR_SLOD = "https://nordurvefur.is";

export interface PostInntak {
  name: string;
  /** Nafnið í eignarfalli. Vantar það er nefnifallið notað. */
  ef?: string;
  /** Nafnið í þolfalli. Vantar það er nefnifallið notað. */
  thf?: string;
}

const ef = (c: PostInntak) => c.ef || c.name;
const thf = (c: PostInntak) => c.thf || c.name;
const synileg = (url: string) => url;

export function efnislina(c: PostInntak) {
  return `Frítt auglýsingamyndband fyrir ${thf(c)}`;
}

/** Málsgreinarnar; `feitt` er feitletrað í HTML-útgáfunni. */
function malsgreinar(c: PostInntak) {
  return [
    { t: "hæhæ" },
    { t: "Helgi Már heiti ég og rek Norðurvef." },
    { t: `Við höfum verið að skoða starfsemi ${ef(c)} og teljum að vörurnar og þjónustan ykkar henti einstaklega vel fyrir þá nýju tegund markaðssetningar sem við höfum verið að vinna með.` },
    { t: "Undanfarið höfum við hjá Norðurvef sérhæft okkur í gerð stuttra auglýsingamyndbanda í 2D og 3D þar sem vörur og þjónusta fyrirtækja eru kynnt á skapandi, sjónrænan og grípandi hátt." },
    { t: "Markmiðið er að fanga athygli fólks, vekja áhuga á vörunum og fá fleiri til að heimsækja vefsíðuna eða hafa samband." },
    { t: "Við höfum meðal annars verið að vinna með myndbönd sem hafa sýnt fram á allt að 55% aukningu í umferð á vefsíður." },
    {
      t: "Okkur langar að bjóða ykkur að prófa þessa nálgun með því að útbúa ",
      feitt: `10 sekúndna auglýsingamyndband fyrir ${thf(c)}, ykkur að kostnaðarlausu og án allra skuldbindinga.`,
    },
    { t: "Hér má sjá nokkur dæmi um myndbönd sem við höfum gert:", slod: MYNDBOND_SLOD },
    { t: "Við viljum gjarnan heyra hvort þið hafið einhverja ákveðna hugmynd að myndbandinu eða hvort þið viljið leyfa okkur að vera skapandi og koma ykkur á óvart." },
    { t: "Það væri gaman að fá stutt svar frá ykkur og heyra hvort þetta sé eitthvað sem gæti höfðað til ykkar." },
  ] as { t: string; feitt?: string; slod?: string }[];
}

const UNDIRSKRIFT = ["Bestu kveðjur,", "Helgi Már Þorvaldsson", "Norðurvefur", "853 5147"];

/** Venjulegur texti (fyrir póstforrit sem sýna ekki HTML, og síðuna í CRM). */
export function postur(c: PostInntak) {
  const m = malsgreinar(c).map((p) => (p.t + (p.feitt || "") + (p.slod ? `\n${synileg(p.slod)}` : "")));
  return [...m, [...UNDIRSKRIFT, synileg(VEFUR_SLOD)].join("\n")].join("\n\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tengill = (url: string) => `<a href="${url}">${esc(synileg(url))}</a>`;

/** HTML-útgáfan sem viðtakandinn sér: feitletrun og stuttir smellanlegir tenglar. */
export function posturHtml(c: PostInntak) {
  const p = malsgreinar(c).map(
    (m) =>
      `<p style="margin:0 0 14px">${esc(m.t)}${m.feitt ? `<b>${esc(m.feitt)}</b>` : ""}${m.slod ? `<br>${tengill(m.slod)}` : ""}</p>`
  );
  const u = `<p style="margin:0">Bestu kveðjur,<br><b>Helgi Már Þorvaldsson</b><br>Norðurvefur<br>853 5147<br>${tengill(VEFUR_SLOD)}</p>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937">${p.join("")}${u}</div>`;
}
