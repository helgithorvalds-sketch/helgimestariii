/**
 * Tölvupósturinn í myndbandaherferðinni (nóv. 2026): frítt 10 sekúndna 2D/3D myndband.
 *
 * Sami texti fyrir alla, nema tvær setningar sem eru skrifaðar fyrir hvert fyrirtæki:
 * `hook` (hvað við sáum hjá þeim) og `idea` (hugmynd að 10 sek. myndbandi fyrir þau).
 * Þessi skrá er notuð bæði þegar pósturinn er sendur og á síðunni „Myndbönd“ í CRM,
 * svo þar sést nákvæmlega hvað hvert fyrirtæki fékk.
 */

export const MYNDBOND_SLOD = "https://nordurvefur.is/myndbond";

export interface PostInntak {
  name: string;
  /** Fullt nafn tengiliðar, ef hann fannst. */
  person?: string;
  /** "personal" þegar netfangið er beint á viðkomandi, annars "generic". */
  email_type?: "personal" | "generic";
  /** Heldur áfram setningunni „Við höfum verið að skoða {name} og …“ */
  hook: string;
  /** Heldur áfram setningunni „Okkur datt t.d. í hug …“ */
  idea: string;
}

const fornafn = (person?: string) => (person || "").trim().split(/\s+/)[0] || "";

const setning = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

const lagstafur = (s: string) => s.trim().replace(/^\p{Lu}(?!\p{Lu})/u, (c) => c.toLowerCase());

export function efnislina(c: Pick<PostInntak, "name">) {
  return `Frítt 10 sekúndna myndband fyrir ${c.name}`;
}

export function postur(c: PostInntak) {
  const nafn = c.email_type === "personal" ? fornafn(c.person) : "";
  const kvedja = nafn ? `Hæ ${nafn},` : "Hæhæ,";

  return [
    kvedja,
    "",
    "Helgi Már heiti ég og stend á bak við Norðurvefur.",
    "",
    `Við höfum verið að skoða ${c.name} og ${setning(lagstafur(c.hook))} Við teljum að þið gætuð hentað mjög vel fyrir nýtt markaðsverkefni sem við erum að fara af stað með: stutt 2D og 3D myndbönd fyrir samfélagsmiðla.`,
    "",
    "Myndböndin geta kynnt þjónustuna, sýnt hvað gerir ykkur betri en aðra, sett fram vandamál og lausnina eða sagt frá tilboði. Við getum líka gert vörurnar ykkar að þrívíddarlíkani sem lifnar við í myndbandinu. Svona myndbönd styrkja traust og ímynd, enda sést strax að í þau hefur verið lögð mikil vinna.",
    "",
    `Til að sýna ykkur gæðin viljum við gera fyrir ykkur 10 sekúndna myndband, algjörlega ykkur að kostnaðarlausu og án nokkurra skuldbindinga. Okkur datt t.d. í hug ${setning(lagstafur(c.idea))}`,
    "",
    `Hér má sjá myndbönd sem við höfum gert: ${MYNDBOND_SLOD}`,
    "",
    "Við höfum kynnt okkur vel hvað heldur athygli fólks í dag, þegar flett er hratt og athyglin er stutt, og byggjum hvert myndband þannig að fólk horfi til enda.",
    "",
    "Ef þið hafið áhuga væri gaman að heyra hvort þið hafið sjálf hugmynd, hvort þið viljið frekar 2D eða 3D, eða hvort við megum bara vera skapandi og sýna ykkur hvað við getum.",
    "",
    "Það væri frábært að fá stutt svar, hvort sem það er já eða nei. Ef þetta er ekki eitthvað fyrir ykkur er það auðvitað ekkert mál, þá vitum við það og höfum ekki frekar samband vegna þessa.",
    "",
    "Bestu kveðjur,",
    "Helgi Már Þorvaldsson",
    "Norðurvefur",
    "nordurvefur.is",
    "853 5147",
  ].join("\n");
}
